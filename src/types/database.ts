export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          subdomain: string | null;
          primary_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subdomain?: string | null;
          primary_color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subdomain?: string | null;
          primary_color?: string | null;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          school_id: string;
          role: 'admin' | 'teacher' | 'parent' | 'student';
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          school_id: string;
          role?: 'admin' | 'teacher' | 'parent' | 'student';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          school_id?: string;
          role?: 'admin' | 'teacher' | 'parent' | 'student';
          created_at?: string;
        };
      };
    };
      academic_years: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
        };
      };
      terms: {
        Row: {
          id: string;
          academic_year_id: string;
          school_id: string;
          name: string;
          term_number: number;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          school_id: string;
          name: string;
          term_number: number;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          academic_year_id?: string;
          school_id?: string;
          name?: string;
          term_number?: number;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
        };
      };
      schedule_slots: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          teacher_subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id: string;
          teacher_subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          class_id?: string;
          teacher_subject_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          room_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
