import { IsUUID } from 'class-validator';

export class AcceptPropositionDto {
  @IsUUID()
  entrepotId!: string;
}
