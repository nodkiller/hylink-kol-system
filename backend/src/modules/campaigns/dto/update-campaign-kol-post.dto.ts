import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignKolPostDto } from './create-campaign-kol-post.dto';

export class UpdateCampaignKolPostDto extends PartialType(CreateCampaignKolPostDto) {}
