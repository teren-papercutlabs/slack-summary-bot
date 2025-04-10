// Basic Slack event types
export interface SlackUser {
  id: string;
  name: string;
  team_id: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  team_id: string;
}

export interface SlackEventBase {
  type: string;
  event_ts: string;
  user: string;
  ts: string;
  team_id: string;
}

// App mention event
export interface SlackAppMentionEvent extends SlackEventBase {
  type: "app_mention";
  text: string;
  channel: string;
  thread_ts?: string;
}

// Challenge request for URL verification
export interface SlackUrlVerificationEvent {
  token: string;
  challenge: string;
  type: "url_verification";
}

// Combined event types
export type SlackEvent = SlackAppMentionEvent | SlackUrlVerificationEvent;

// Event callback envelope
export interface SlackEventCallback {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  type: "event_callback" | "url_verification";
  event_id: string;
  event_time: number;
  authorizations: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }>;
}
