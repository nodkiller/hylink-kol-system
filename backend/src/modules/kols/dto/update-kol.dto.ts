import { PartialType } from '@nestjs/mapped-types';
import { CreateKolDto } from './create-kol.dto';

/**
 * All fields are optional for PATCH.
 * platforms behaviour in update:
 *   - undefined (field omitted)  → platforms are NOT touched
 *   - []  (empty array)          → ALL existing platforms are deleted
 *   - [{...}]                    → provided platforms are upserted,
 *                                   platforms NOT in the list are deleted
 */
export class UpdateKolDto extends PartialType(CreateKolDto) {}
