export interface HomeItem {
  id: string;
  user_id: string;
  item_type: string;
  label: string;
  last_serviced_date: string; // YYYY-MM-DD
  interval_months: number;
  category_slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceCatalogItem {
  id?: string;
  item_type: string;
  default_label: string;
  default_interval_months: number;
  category_slug: string;
  icon_name: string;
  created_at?: string;
}

export interface ReminderStatus {
  dueDate: Date;
  dueDateStr: string; // YYYY-MM-DD
  diffDays: number; // positive = overdue by diffDays, 0 = due today, negative = days remaining
  isDue: boolean; // today >= dueDate (diffDays >= 0)
  isOverdue: boolean; // diffDays > 0
  statusText: string;
}

export interface HomeItemWithStatus extends HomeItem {
  status: ReminderStatus;
}
