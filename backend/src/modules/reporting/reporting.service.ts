import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignKol } from '../campaigns/entities/campaign-kol.entity';
import { Kol } from '../kols/entities/kol.entity';
import { CampaignKolStatus } from '../../common/enums';

// ─── PDF constants ─────────────────────────────────────────────────────────────

const W = 595, H = 842, M = 50, CW = 495;

const C = {
  primary:   rgb(0.392, 0.471, 0.902),
  dark:      rgb(0.11,  0.13,  0.16),
  body:      rgb(0.25,  0.28,  0.33),
  muted:     rgb(0.47,  0.52,  0.58),
  lightBg:   rgb(0.97,  0.97,  0.98),
  tableBg:   rgb(0.14,  0.18,  0.24),
  rowAlt:    rgb(0.96,  0.97,  0.98),
  border:    rgb(0.86,  0.89,  0.92),
  white:     rgb(1,     1,     1),
  green:     rgb(0.06,  0.47,  0.28),
  lightBlue: rgb(0.75,  0.82,  1),
};

/** Convert distance-from-page-top to pdf-lib's bottom-left y for a rectangle. */
const ry = (fromTop: number, h: number) => H - fromTop - h;

/** Approximate text baseline y for text whose visual top starts `fromTop` pts from page top. */
const ty = (fromTop: number, size: number) => H - fromTop - size * 0.82;

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignKol)
    private readonly ckRepo: Repository<CampaignKol>,
    @InjectRepository(Kol)
    private readonly kolRepo: Repository<Kol>,
  ) {}

  // ── Dashboard stats ──────────────────────────────────────────────────────────

  async getDashboardStats() {
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalKols, kolsThisMonth, totalCampaigns] = await Promise.all([
      this.kolRepo.count(),
      this.kolRepo.createQueryBuilder('k')
        .where('k.createdAt >= :d', { d: firstOfMonth })
        .getCount(),
      this.campaignRepo.count(),
    ]);

    const [campaignStatusRows, pipelineRows] = await Promise.all([
      this.campaignRepo
        .createQueryBuilder('c')
        .select('c.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.status')
        .getRawMany<{ status: string; count: string }>(),
      this.ckRepo
        .createQueryBuilder('ck')
        .select('ck.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('ck.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    const campaignsByStatus = Object.fromEntries(
      campaignStatusRows.map((r) => [r.status, Number(r.count)]),
    );
    const activeCampaigns = campaignsByStatus['Executing'] ?? 0;

    const recentCampaigns = await this.campaignRepo.find({
      relations: ['campaignKols'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // ── Financial aggregation ────────────────────────────────────────────────

    const [finTotals, unpaidResult, campaignPnlRaw, monthlyTrendRaw] = await Promise.all([
      // Overall revenue / expenses totals
      this.campaignRepo.query(`
        SELECT
          COALESCE(SUM(c.client_billing), 0)::float   AS "totalRevenue",
          COALESCE(SUM(c.other_expenses), 0)::float   AS "totalOtherExpenses",
          COALESCE(SUM(ck_sum.kol_cost),  0)::float   AS "totalKolCost"
        FROM campaigns c
        LEFT JOIN (
          SELECT campaign_id, SUM(negotiated_fee) AS kol_cost
          FROM campaign_kols
          GROUP BY campaign_id
        ) ck_sum ON ck_sum.campaign_id = c.id
      `),

      // Unpaid KOL obligations
      this.ckRepo.query(`
        SELECT
          COUNT(*)::int                               AS "unpaidKolCount",
          COALESCE(SUM(negotiated_fee), 0)::float     AS "unpaidKolTotal"
        FROM campaign_kols
        WHERE is_paid = false
          AND negotiated_fee IS NOT NULL
      `),

      // Per-campaign P&L (latest 20)
      this.campaignRepo.query(`
        SELECT
          c.id,
          c.name,
          c.client_name                                         AS "clientName",
          c.status,
          COALESCE(c.client_billing,  0)::float                AS revenue,
          COALESCE(ck_sum.kol_cost,   0)::float                AS "kolCost",
          COALESCE(c.other_expenses,  0)::float                AS "otherExpenses",
          COALESCE(ck_sum.kol_count,  0)::int                  AS "kolCount"
        FROM campaigns c
        LEFT JOIN (
          SELECT campaign_id,
                 SUM(negotiated_fee) AS kol_cost,
                 COUNT(*)            AS kol_count
          FROM campaign_kols
          GROUP BY campaign_id
        ) ck_sum ON ck_sum.campaign_id = c.id
        ORDER BY c.created_at DESC
        LIMIT 20
      `),

      // Monthly revenue / cost trend (last 6 months)
      this.campaignRepo.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', c.created_at), 'Mon YY') AS month,
          COALESCE(SUM(c.client_billing),  0)::float           AS revenue,
          COALESCE(SUM(ck_sum.kol_cost),   0)::float           AS "kolCost",
          COALESCE(SUM(c.other_expenses),  0)::float           AS "otherExpenses"
        FROM campaigns c
        LEFT JOIN (
          SELECT campaign_id, SUM(negotiated_fee) AS kol_cost
          FROM campaign_kols
          GROUP BY campaign_id
        ) ck_sum ON ck_sum.campaign_id = c.id
        WHERE c.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', c.created_at)
        ORDER BY DATE_TRUNC('month', c.created_at) ASC
      `),
    ]);

    const totalRevenue       = Number(finTotals[0]?.totalRevenue       ?? 0);
    const totalKolCost       = Number(finTotals[0]?.totalKolCost       ?? 0);
    const totalOtherExpenses = Number(finTotals[0]?.totalOtherExpenses ?? 0);
    const grossProfit        = totalRevenue - totalKolCost;
    const netProfit          = grossProfit - totalOtherExpenses;
    const grossMarginPct     = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMarginPct       = totalRevenue > 0 ? (netProfit   / totalRevenue) * 100 : 0;

    return {
      totalKols,
      kolsThisMonth,
      totalCampaigns,
      activeCampaigns,
      campaignsByStatus,
      pipelineByStatus: Object.fromEntries(
        pipelineRows.map((r) => [r.status, Number(r.count)]),
      ),
      recentCampaigns: recentCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        clientName: c.clientName,
        status: c.status,
        kolCount: c.campaignKols?.length ?? 0,
      })),
      // Financial P&L
      totalRevenue,
      totalKolCost,
      totalOtherExpenses,
      grossProfit,
      netProfit,
      grossMarginPct,
      netMarginPct,
      unpaidKolCount: Number(unpaidResult[0]?.unpaidKolCount ?? 0),
      unpaidKolTotal: Number(unpaidResult[0]?.unpaidKolTotal ?? 0),
      campaignPnl: campaignPnlRaw.map((r: Record<string, string>) => ({
        id:            r.id,
        name:          r.name,
        clientName:    r.clientName,
        status:        r.status,
        revenue:       Number(r.revenue),
        kolCost:       Number(r.kolCost),
        otherExpenses: Number(r.otherExpenses),
        kolCount:      Number(r.kolCount),
        grossProfit:   Number(r.revenue) - Number(r.kolCost),
        netProfit:     Number(r.revenue) - Number(r.kolCost) - Number(r.otherExpenses),
      })),
      monthlyTrend: monthlyTrendRaw.map((r: Record<string, string>) => ({
        month:         r.month,
        revenue:       Number(r.revenue),
        kolCost:       Number(r.kolCost),
        otherExpenses: Number(r.otherExpenses),
        netProfit:     Number(r.revenue) - Number(r.kolCost) - Number(r.otherExpenses),
      })),
    };
  }

  // ── Campaign PDF report ──────────────────────────────────────────────────────

  async generateCampaignPdf(campaignId: string): Promise<Buffer> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const kols = await this.ckRepo.find({
      where: { campaignId },
      relations: ['kol', 'kol.platforms'],
      order: { status: 'ASC', createdAt: 'ASC' },
    });

    // ── Aggregate KPIs ──
    const totalSpend = kols.reduce((s, k) => s + (Number(k.negotiatedFee) || 0), 0);
    const pipelineCounts: Record<string, number> = Object.fromEntries(
      Object.values(CampaignKolStatus).map((s) => [s, kols.filter((k) => k.status === s).length]),
    );

    // ── Build PDF ──
    const pdfDoc = await PDFDocument.create();
    const bld = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const reg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const trunc = (text: string, font: typeof bld, size: number, maxW: number): string => {
      if (!text) return '';
      if (font.widthOfTextAtSize(text, size) <= maxW) return text;
      let t = text;
      while (t.length > 0 && font.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
      return t + '...';
    };

    const addFooter = (p: ReturnType<typeof pdfDoc.addPage>, n: number) => {
      p.drawLine({ start: { x: M, y: 28 }, end: { x: W - M, y: 28 }, thickness: 0.4, color: C.border });
      p.drawText('Hylink Australia  ·  KOL Campaign Report  ·  Confidential', {
        x: M, y: 15, size: 7, font: reg, color: C.muted,
      });
      p.drawText(`Page ${n}`, { x: W - M - 28, y: 15, size: 7, font: reg, color: C.muted });
    };

    let page = pdfDoc.addPage([W, H]);
    let pageCount = 1;

    // ── HEADER BAND (0-90pt from top) ──
    page.drawRectangle({ x: 0, y: ry(0, 90), width: W, height: 90, color: C.primary });
    page.drawText('CAMPAIGN PERFORMANCE REPORT', {
      x: M, y: ty(13, 8), size: 8, font: reg, color: C.lightBlue,
    });
    page.drawText(trunc(campaign.name, bld, 18, CW - 20), {
      x: M, y: ty(38, 18), size: 18, font: bld, color: C.white,
    });
    page.drawText(
      `Client: ${campaign.clientName}${campaign.startDate ? `  ·  ${campaign.startDate} → ${campaign.endDate ?? '?'}` : ''}`,
      { x: M, y: ty(62, 9), size: 9, font: reg, color: C.lightBlue },
    );
    page.drawText(
      `Generated: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}  ·  Prepared by Hylink Australia`,
      { x: M, y: ty(77, 7.5), size: 7.5, font: reg, color: rgb(0.65, 0.73, 0.95) },
    );

    // ── KPI CARDS (102-167pt from top, cardH=65) ──
    const CARDS_TOP = 102, CARD_W = 113, CARD_H = 65, CARD_GAP = 11;
    const cardData = [
      { label: 'TOTAL KOLS', value: String(kols.length) },
      { label: 'CLIENT APPROVED', value: String(pipelineCounts[CampaignKolStatus.APPROVED_BY_CLIENT]) },
      { label: 'CONTRACTED', value: String(pipelineCounts[CampaignKolStatus.CONTRACTED]) },
      {
        label: 'PUBLISHED / DONE',
        value: String(
          (pipelineCounts[CampaignKolStatus.PUBLISHED] ?? 0) +
          (pipelineCounts[CampaignKolStatus.COMPLETED] ?? 0),
        ),
      },
    ];

    cardData.forEach((card, i) => {
      const cx = M + i * (CARD_W + CARD_GAP);
      const cardBottom = ry(CARDS_TOP, CARD_H);
      page.drawRectangle({ x: cx, y: cardBottom, width: CARD_W, height: CARD_H, color: C.lightBg });
      page.drawRectangle({ x: cx, y: ry(CARDS_TOP, 4), width: CARD_W, height: 4, color: C.primary });
      page.drawText(card.label, {
        x: cx + 8, y: cardBottom + 38, size: 7, font: reg, color: C.muted,
      });
      page.drawText(card.value, {
        x: cx + 8, y: cardBottom + 11, size: 22, font: bld, color: C.dark,
      });
    });

    // ── TOTAL SPEND (179-224pt from top, h=45) ──
    const SPEND_TOP = CARDS_TOP + CARD_H + 12;
    const spendBottom = ry(SPEND_TOP, 45);
    page.drawRectangle({ x: M, y: spendBottom, width: CW, height: 45, color: C.lightBg });
    page.drawText('TOTAL NEGOTIATED SPEND (AUD)', {
      x: M + 12, y: spendBottom + 27, size: 7, font: reg, color: C.muted,
    });
    const spendStr = totalSpend > 0
      ? `$${totalSpend.toLocaleString('en-AU', { minimumFractionDigits: 0 })}`
      : 'Not yet recorded';
    page.drawText(spendStr, {
      x: M + 12, y: spendBottom + 8, size: 18, font: bld, color: totalSpend > 0 ? C.green : C.muted,
    });

    // ── PIPELINE TABLE (section header at 242, table at 262) ──
    const PIPE_SEC_TOP = SPEND_TOP + 45 + 18;
    page.drawText('Pipeline Status Breakdown', {
      x: M, y: ty(PIPE_SEC_TOP, 12), size: 12, font: bld, color: C.dark,
    });

    const PIPE_TBL_TOP = PIPE_SEC_TOP + 20;
    const ROW_H = 20;
    // Header row
    page.drawRectangle({ x: M, y: ry(PIPE_TBL_TOP, ROW_H), width: CW, height: ROW_H, color: C.tableBg });
    page.drawText('Pipeline Status', { x: M + 8, y: ry(PIPE_TBL_TOP, ROW_H) + 7, size: 8, font: bld, color: C.white });
    page.drawText('KOLs', { x: M + 330 + 8, y: ry(PIPE_TBL_TOP, ROW_H) + 7, size: 8, font: bld, color: C.white });
    page.drawText('% of Total', { x: M + 415 + 8, y: ry(PIPE_TBL_TOP, ROW_H) + 7, size: 8, font: bld, color: C.white });

    let tableY = PIPE_TBL_TOP + ROW_H;
    Object.values(CampaignKolStatus).forEach((status, idx) => {
      const count = pipelineCounts[status] ?? 0;
      const pct = kols.length > 0 ? ((count / kols.length) * 100).toFixed(1) : '0.0';
      const bg = idx % 2 === 0 ? C.white : C.rowAlt;
      page.drawRectangle({ x: M, y: ry(tableY, ROW_H), width: CW, height: ROW_H, color: bg });
      page.drawText(status.replace(/_/g, ' '), {
        x: M + 8, y: ry(tableY, ROW_H) + 6, size: 8, font: count > 0 ? bld : reg, color: count > 0 ? C.body : C.muted,
      });
      page.drawText(String(count), {
        x: M + 338, y: ry(tableY, ROW_H) + 6, size: 8, font: count > 0 ? bld : reg, color: count > 0 ? C.dark : C.muted,
      });
      page.drawText(`${pct}%`, {
        x: M + 423, y: ry(tableY, ROW_H) + 6, size: 8, font: reg, color: C.body,
      });
      page.drawLine({
        start: { x: M, y: ry(tableY, ROW_H) },
        end: { x: M + CW, y: ry(tableY, ROW_H) },
        thickness: 0.3, color: C.border,
      });
      tableY += ROW_H;
    });

    // ── KOL DETAILS TABLE ──
    const KOL_SEC_TOP = tableY + 18;
    const KOL_ROW_H = 21;
    const KOL_HDR_H = 24;
    // Column x-positions: #(25) | Name(150) | Platform(80) | Followers(75) | Status(115) | Fee(50)
    const KCX = [M, M + 25, M + 175, M + 255, M + 330, M + 445];

    const drawKolTableHeader = (p: ReturnType<typeof pdfDoc.addPage>, fromTop: number) => {
      p.drawRectangle({ x: M, y: ry(fromTop, KOL_HDR_H), width: CW, height: KOL_HDR_H, color: C.tableBg });
      ['#', 'KOL Name', 'Platform', 'Followers', 'Pipeline Status', 'Fee'].forEach((h, i) => {
        p.drawText(h, { x: KCX[i] + 5, y: ry(fromTop, KOL_HDR_H) + 8, size: 8, font: bld, color: C.white });
      });
    };

    // Check if KOL section fits on page 1 (need at least header + 1 row)
    const MAX_ROW_BOTTOM = H - 50; // rows must have bottom-left y >= 50
    const kolSectionFits = KOL_SEC_TOP + 20 + KOL_HDR_H + KOL_ROW_H <= MAX_ROW_BOTTOM;

    if (!kolSectionFits) {
      addFooter(page, pageCount);
      page = pdfDoc.addPage([W, H]);
      pageCount++;
    }

    let kolY = kolSectionFits ? KOL_SEC_TOP : 40;
    page.drawText('KOL Performance Details', {
      x: M, y: ty(kolY, 12), size: 12, font: bld, color: C.dark,
    });
    let kolTblY = kolY + 20;
    drawKolTableHeader(page, kolTblY);
    let kolRowY = kolTblY + KOL_HDR_H;

    kols.forEach((ck, idx) => {
      // Page break check
      if (ry(kolRowY, KOL_ROW_H) < 50) {
        addFooter(page, pageCount);
        page = pdfDoc.addPage([W, H]);
        pageCount++;
        kolRowY = 40;
        drawKolTableHeader(page, kolRowY);
        kolRowY += KOL_HDR_H;
      }

      const top = ck.kol?.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
      const fCount = top?.followersCount;
      const followersStr = fCount == null
        ? '—'
        : fCount >= 1_000_000 ? `${(fCount / 1_000_000).toFixed(1)}M`
        : fCount >= 1000 ? `${(fCount / 1000).toFixed(0)}K`
        : String(fCount);

      const feeStr = ck.negotiatedFee ? `$${Number(ck.negotiatedFee).toLocaleString()}` : '—';
      const bg = idx % 2 === 0 ? C.white : C.rowAlt;

      page.drawRectangle({ x: M, y: ry(kolRowY, KOL_ROW_H), width: CW, height: KOL_ROW_H, color: bg });

      const rowVals = [
        String(idx + 1),
        trunc(ck.kol?.name ?? '—', reg, 8, 145),
        trunc(top?.platformName ?? '—', reg, 8, 72),
        followersStr,
        trunc(ck.status.replace(/_/g, ' '), reg, 8, 107),
        feeStr,
      ];
      rowVals.forEach((val, i) => {
        page.drawText(val, {
          x: KCX[i] + 5, y: ry(kolRowY, KOL_ROW_H) + 7, size: 8, font: reg, color: C.body,
        });
      });
      page.drawLine({
        start: { x: M, y: ry(kolRowY, KOL_ROW_H) },
        end: { x: M + CW, y: ry(kolRowY, KOL_ROW_H) },
        thickness: 0.3, color: C.border,
      });
      kolRowY += KOL_ROW_H;
    });

    if (kols.length === 0) {
      page.drawText('No KOLs have been added to this campaign yet.', {
        x: M + 8, y: ry(kolRowY, KOL_ROW_H) + 7, size: 8, font: reg, color: C.muted,
      });
    }

    addFooter(page, pageCount);

    return Buffer.from(await pdfDoc.save());
  }
}
