export type MemberBalance = {
  user_id: string;
  display_name: string;
  // Positive = the member is owed money; negative = the member owes.
  balance_cents: number;
};

export type Settlement = {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount_cents: number;
};

export type TripSettlement = {
  balances: MemberBalance[];
  settlements: Settlement[];
};
