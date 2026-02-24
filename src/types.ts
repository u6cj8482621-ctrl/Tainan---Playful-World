export type Category = '交通' | '吃吃' | '景點' | '其他';

export interface TravelEntry {
  id: number;
  day: number;
  time: string;
  location: string;
  category: Category;
  content: string;
  image_url?: string;
  coordinates?: string;
}

export interface Trip {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
}

export interface DayDate {
  day: number;
  date: string;
}
