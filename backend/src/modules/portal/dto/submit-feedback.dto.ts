import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ClientFeedback } from '../../../common/enums';

export class SubmitFeedbackDto {
  @IsEnum(ClientFeedback)
  clientFeedback: ClientFeedback;

  @IsOptional()
  @IsString()
  clientComment?: string;
}
