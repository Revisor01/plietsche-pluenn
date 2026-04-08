export interface CreateCampaignBody {
  title: string;
  description?: string;
  multiplier: number;
  startsAt: string; // ISO string
  endsAt: string;
}

export interface UpdateCampaignBody {
  title?: string;
  description?: string;
  multiplier?: number;
  startsAt?: string;
  endsAt?: string;
}
