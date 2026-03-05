import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AddKolsToCampaignDto {
  /**
   * Array of KOL UUIDs to add to the campaign.
   * Each KOL will be added with status = Shortlisted.
   * Blacklisted KOLs and duplicates are reported but do not cause the whole request to fail.
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one KOL ID must be provided' })
  @ArrayUnique({ message: 'Duplicate KOL IDs are not allowed in the same request' })
  @IsUUID('4', { each: true, message: 'Each kolId must be a valid UUID' })
  kolIds: string[];
}
