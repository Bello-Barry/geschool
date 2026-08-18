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
          school_id: string | null;
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
      teacher_subjects: {
        Row: {
          id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          school_id: string;
          coefficient: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          school_id: string;
          coefficient?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          subject_id?: string;
          class_id?: string;
          school_id?: string;
          coefficient?: number | null;
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
      programmes: {
        Row: {
          id: string;
          school_id: string;
          subject_id: string;
          class_id: string;
          term_id: string;
          week_number: number;
          topic: string;
          learning_objectives: string | null;
          resources: string | null;
          evaluation_method: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          subject_id: string;
          class_id: string;
          term_id: string;
          week_number: number;
          topic: string;
          learning_objectives?: string | null;
          resources?: string | null;
          evaluation_method?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          subject_id?: string;
          class_id?: string;
          term_id?: string;
          week_number?: number;
          topic?: string;
          learning_objectives?: string | null;
          resources?: string | null;
          evaluation_method?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          school_id: string;
          title: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          title?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          title?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          term_id: string | null;
          programme_entry_id: string | null;
          title: string;
          key_points: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          term_id?: string | null;
          programme_entry_id?: string | null;
          title: string;
          key_points?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string;
          subject_id?: string;
          class_id?: string;
          term_id?: string | null;
          programme_entry_id?: string | null;
          title?: string;
          key_points?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      course_attachments: {
        Row: {
          id: string;
          course_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          created_at?: string;
        };
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          created_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          term_id: string | null;
          type: 'devoir_maison';
          title: string;
          description: string;
          due_date: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          term_id?: string | null;
          type: 'devoir_maison';
          title: string;
          description?: string;
          due_date: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string;
          subject_id?: string;
          class_id?: string;
          term_id?: string | null;
          type?: 'devoir_maison';
          title?: string;
          description?: string;
          due_date?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      td_sessions: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          term_id: string | null;
          type: 'td' | 'tp';
          title: string;
          session_date: string;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id: string;
          subject_id: string;
          class_id: string;
          term_id?: string | null;
          type?: 'td' | 'tp';
          title: string;
          session_date: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string;
          subject_id?: string;
          class_id?: string;
          term_id?: string | null;
          type?: 'td' | 'tp';
          title?: string;
          session_date?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      td_materials: {
        Row: {
          id: string;
          td_session_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          td_session_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          td_session_id?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          created_at?: string;
        };
      };
      td_attendance: {
        Row: {
          id: string;
          td_session_id: string;
          student_id: string;
          status: 'present' | 'absent';
          marked_at: string;
        };
        Insert: {
          id?: string;
          td_session_id: string;
          student_id: string;
          status: 'present' | 'absent';
          marked_at?: string;
        };
        Update: {
          id?: string;
          td_session_id?: string;
          student_id?: string;
          status?: 'present' | 'absent';
          marked_at?: string;
        };
      };
      assignment_attachments: {
        Row: {
          id: string;
          assignment_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          created_at?: string;
        };
      };
      assignment_completions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          completed_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          school_id: string;
          academic_year_id: string | null;
          monthly_due_id: string | null;
          amount: number;
          payment_date: string;
          payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'check' | null;
          reference_number: string | null;
          notes: string | null;
          status: 'pending' | 'confirmed' | 'rejected';
          declared_by: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          receipt_pdf_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          school_id: string;
          academic_year_id?: string | null;
          monthly_due_id?: string | null;
          amount: number;
          payment_date: string;
          payment_method?: 'cash' | 'mobile_money' | 'bank_transfer' | 'check' | null;
          reference_number?: string | null;
          notes?: string | null;
          status?: 'pending' | 'confirmed' | 'rejected';
          declared_by?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          receipt_pdf_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          school_id?: string;
          academic_year_id?: string | null;
          monthly_due_id?: string | null;
          amount?: number;
          payment_date?: string;
          payment_method?: 'cash' | 'mobile_money' | 'bank_transfer' | 'check' | null;
          reference_number?: string | null;
          notes?: string | null;
          status?: 'pending' | 'confirmed' | 'rejected';
          declared_by?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          receipt_pdf_url?: string | null;
          created_at?: string;
        };
      };
      monthly_dues: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          class_id: string;
          academic_year_id: string | null;
          period_year: number;
          period_month: number;
          amount: number;
          due_date: string;
          status: 'paid' | 'unpaid';
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          class_id: string;
          academic_year_id?: string | null;
          period_year: number;
          period_month: number;
          amount: number;
          due_date: string;
          status?: 'paid' | 'unpaid';
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          class_id?: string;
          academic_year_id?: string | null;
          period_year?: number;
          period_month?: number;
          amount?: number;
          due_date?: string;
          status?: 'paid' | 'unpaid';
          created_at?: string;
        };
      };
      tuition_fees: {
        Row: {
          id: string;
          school_id: string;
          class_id: string | null;
          academic_year_id: string | null;
          amount: number;
          description: string | null;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id?: string | null;
          academic_year_id?: string | null;
          amount: number;
          description?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          class_id?: string | null;
          academic_year_id?: string | null;
          amount?: number;
          description?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          school_id: string;
          title: string;
          message: string;
          type: 'info' | 'warning' | 'success' | 'error';
          is_read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          school_id: string;
          title: string;
          message: string;
          type: 'info' | 'warning' | 'success' | 'error';
          is_read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          school_id?: string;
          title?: string;
          message?: string;
          type?: 'info' | 'warning' | 'success' | 'error';
          is_read?: boolean;
          link?: string | null;
          created_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          school_id: string;
          title: string;
          content: string;
          audience: 'all' | 'teachers' | 'parents' | 'students';
          status: 'draft' | 'published';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          title: string;
          content: string;
          audience?: 'all' | 'teachers' | 'parents' | 'students';
          status?: 'draft' | 'published';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          title?: string;
          content?: string;
          audience?: 'all' | 'teachers' | 'parents' | 'students';
          status?: 'draft' | 'published';
          created_by?: string | null;
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
