import { IsBoolean, IsOptional, IsEnum } from 'class-validator';

export enum LastSeenVisibility {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

export enum ReadReceiptsVisibility {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

export class PrivacySettingsDto {
  @IsOptional()
  @IsEnum(LastSeenVisibility)
  lastSeenVisibility?: LastSeenVisibility;

  @IsOptional()
  @IsEnum(ReadReceiptsVisibility)
  readReceiptsVisibility?: ReadReceiptsVisibility;

  @IsOptional()
  @IsBoolean()
  allowContactRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;
}

export interface PrivacySettings {
  lastSeenVisibility: LastSeenVisibility;
  readReceiptsVisibility: ReadReceiptsVisibility;
  allowContactRequests: boolean;
  showOnlineStatus: boolean;
}