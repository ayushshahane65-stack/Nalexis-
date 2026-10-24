export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ShelfStatus = "reading" | "finished" | "to-read" | "favourites" | "paused";
export type LibraryBookStatus = "currently_reading" | "finished" | "paused" | "dropped" | "want_to_read";
export type JourneyEventType = "started_book" | "finished_book" | "added_to_shelf" | "saved_quote" | "reached_goal" | "explored_genre";
export type DiscussionTab = "chapters" | "themes" | "reviews" | "quotes" | "questions" | "theories" | "resources";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                string;
          username:          string | null;
          display_name:      string | null;
          avatar_color:      string;
          reading_goal:      number;
          bio:               string | null;
          avatar_url:        string | null;
          favourite_genres:  string[];
          favourite_authors: string[];
          yearly_goal:       number;
          goal_year:         number;
          cover_image?:                string | null;
          reading_philosophy?:         string | null;
          literary_interests?:         string[];
          featured_book_source?:       string | null;
          featured_book_id?:           string | null;
          featured_book_title?:        string | null;
          featured_book_author?:       string | null;
          featured_book_cover?:        string | null;
          featured_shelf_id?:          string | null;
          theme_accent?:               string;
          showcase_currently_reading?: boolean;
          showcase_completed?:          boolean;
          showcase_favourites?:         boolean;
          showcase_quotes?:             boolean;
          showcase_journey?:            boolean;
          created_at:                  string;
          updated_at:                  string;
        };
        Insert: {
          id:                          string;
          username?:                   string | null;
          display_name?:               string | null;
          avatar_color?:               string;
          reading_goal?:               number;
          bio?:                        string | null;
          avatar_url?:                 string | null;
          favourite_genres?:           string[];
          favourite_authors?:          string[];
          yearly_goal?:                number;
          goal_year?:                  number;
          cover_image?:                string | null;
          reading_philosophy?:         string | null;
          literary_interests?:         string[];
          featured_book_source?:       string | null;
          featured_book_id?:           string | null;
          featured_book_title?:        string | null;
          featured_book_author?:       string | null;
          featured_book_cover?:        string | null;
          featured_shelf_id?:          string | null;
          theme_accent?:               string;
          showcase_currently_reading?: boolean;
          showcase_completed?:          boolean;
          showcase_favourites?:         boolean;
          showcase_quotes?:             boolean;
          showcase_journey?:            boolean;
          created_at?:                 string;
          updated_at?:                 string;
        };
        Update: {
          username?:                   string | null;
          display_name?:               string | null;
          avatar_color?:               string;
          reading_goal?:               number;
          bio?:                        string | null;
          avatar_url?:                 string | null;
          favourite_genres?:           string[];
          favourite_authors?:          string[];
          yearly_goal?:                number;
          goal_year?:                  number;
          cover_image?:                string | null;
          reading_philosophy?:         string | null;
          literary_interests?:         string[];
          featured_book_source?:       string | null;
          featured_book_id?:           string | null;
          featured_book_title?:        string | null;
          featured_book_author?:       string | null;
          featured_book_cover?:        string | null;
          featured_shelf_id?:          string | null;
          theme_accent?:               string;
          showcase_currently_reading?: boolean;
          showcase_completed?:          boolean;
          showcase_favourites?:         boolean;
          showcase_quotes?:             boolean;
          showcase_journey?:            boolean;
          updated_at?:                 string;
        };
      };
      authors: {
        Row: {
          id:              string;
          name:            string;
          slug:            string;
          born:            string | null;
          nationality:     string | null;
          bio:             string;
          long_bio:        string | null;
          philosophy:      string | null;
          book_count:      number;
          cover_color:     string;
          cover_color_alt: string;
          verified:        boolean;
          spotlight:       boolean;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          name:             string;
          slug:             string;
          born?:            string | null;
          nationality?:     string | null;
          bio?:             string;
          long_bio?:        string | null;
          philosophy?:      string | null;
          book_count?:      number;
          cover_color?:     string;
          cover_color_alt?: string;
          verified?:        boolean;
          spotlight?:       boolean;
          created_at?:      string;
        };
        Update: {
          bio?:        string;
          long_bio?:   string | null;
          philosophy?: string | null;
          book_count?: number;
          verified?:   boolean;
          spotlight?:  boolean;
        };
      };
      author_follows: {
        Row: {
          id:         string;
          author_id:  string;
          user_id:    string;
          created_at: string;
        };
        Insert: {
          id?:        string;
          author_id:  string;
          user_id:    string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      shelf_entries: {
        Row: {
          id:              string;
          user_id:         string;
          book_id:         string;
          book_source:     string;
          status:          ShelfStatus;
          current_page:    number | null;
          personal_rating: number | null;
          note:            string | null;
          started_at:      string | null;
          finished_at:     string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:              string;
          user_id:          string;
          book_id:          string;
          book_source:      string;
          status:           ShelfStatus;
          current_page?:    number | null;
          personal_rating?: number | null;
          note?:            string | null;
          started_at?:      string | null;
          finished_at?:     string | null;
          created_at?:      string;
          updated_at?:      string;
        };
        Update: {
          status?:          ShelfStatus;
          current_page?:    number | null;
          personal_rating?: number | null;
          note?:            string | null;
          started_at?:      string | null;
          finished_at?:     string | null;
          updated_at?:      string;
        };
      };
      reading_goals: {
        Row: {
          id:         string;
          user_id:    string;
          year:       number;
          target:     number;
          progress:   number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?:         string;
          user_id:     string;
          year:        number;
          target:      number;
          progress?:   number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          target?:     number;
          progress?:   number;
          updated_at?: string;
        };
      };
      communities: {
        Row: {
          id:           string;
          book_id:      string;
          book_source:  string | null;
          member_count: number;
          post_count:   number;
          created_at:   string;
        };
        Insert: {
          id?:           string;
          book_id:       string;
          book_source?:  string | null;
          member_count?: number;
          post_count?:   number;
          created_at?:   string;
        };
        Update: {
          member_count?: number;
          post_count?:   number;
        };
      };
      community_members: {
        Row: {
          id:           string;
          community_id: string;
          user_id:      string;
          joined_at:    string;
        };
        Insert: {
          id?:           string;
          community_id:  string;
          user_id:       string;
          joined_at?:    string;
        };
        Update: Record<string, never>;
      };
      discussion_posts: {
        Row: {
          id:           string;
          community_id: string;
          user_id:      string;
          tab:          DiscussionTab;
          title:        string;
          body:         string;
          like_count:   number;
          reply_count:  number;
          pinned:       boolean;
          created_at:   string;
          updated_at:   string;
        };
        Insert: {
          id?:           string;
          community_id:  string;
          user_id:       string;
          tab:           DiscussionTab;
          title:         string;
          body:          string;
          like_count?:   number;
          reply_count?:  number;
          pinned?:       boolean;
          created_at?:   string;
          updated_at?:   string;
        };
        Update: {
          title?:       string;
          body?:        string;
          like_count?:  number;
          reply_count?: number;
          pinned?:      boolean;
          updated_at?:  string;
        };
      };
      post_likes: {
        Row: {
          id:         string;
          post_id:    string;
          user_id:    string;
          created_at: string;
        };
        Insert: {
          id?:         string;
          post_id:     string;
          user_id:     string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      reading_circles: {
        Row: {
          id:                string;
          name:              string;
          description:       string | null;
          book_id:           string;
          book_source:       string | null;
          owner_id:          string;
          is_public:         boolean;
          member_count:      number;
          current_page_goal: number | null;
          created_at:        string;
        };
        Insert: {
          id?:                string;
          name:               string;
          description?:       string | null;
          book_id:            string;
          book_source:        string;
          owner_id:           string;
          is_public?:         boolean;
          member_count?:      number;
          current_page_goal?: number | null;
          created_at?:        string;
        };
        Update: {
          name?:              string;
          description?:       string | null;
          is_public?:         boolean;
          member_count?:      number;
          current_page_goal?: number | null;
        };
      };
      circle_members: {
        Row: {
          id:           string;
          circle_id:    string;
          user_id:      string;
          current_page: number;
          joined_at:    string;
        };
        Insert: {
          id?:           string;
          circle_id:     string;
          user_id:       string;
          current_page?: number;
          joined_at?:    string;
        };
        Update: {
          current_page?: number;
        };
      };
      library_books: {
        Row: {
          id:                   string;
          user_id:              string;
          source:               string;
          book_id:              string;
          status:               LibraryBookStatus;
          progress:             number;
          started_at:           string | null;
          finished_at:          string | null;
          rating:               number | null;
          reflection:           string | null;
          is_reflection_shared: boolean;
          is_favourite:         boolean;
          created_at:           string;
          updated_at:           string;
        };
        Insert: {
          id?:                   string;
          user_id:              string;
          source:               string;
          book_id:              string;
          status:               LibraryBookStatus;
          progress?:             number;
          started_at?:           string | null;
          finished_at?:          string | null;
          rating?:               number | null;
          reflection?:           string | null;
          is_reflection_shared?: boolean;
          is_favourite?:         boolean;
          created_at?:           string;
          updated_at?:           string;
        };
        Update: {
          status?:               LibraryBookStatus;
          progress?:             number;
          started_at?:           string | null;
          finished_at?:          string | null;
          rating?:               number | null;
          reflection?:           string | null;
          is_reflection_shared?: boolean;
          is_favourite?:         boolean;
          updated_at?:           string;
        };
      };
      shelves: {
        Row: {
          id:          string;
          user_id:     string;
          name:        string;
          description: string | null;
          cover_image: string | null;
          is_public:   boolean;
          order_index: number;
          is_default:  boolean;
          slug:        string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: {
          id?:          string;
          user_id:     string;
          name:        string;
          description?: string | null;
          cover_image?: string | null;
          is_public?:   boolean;
          order_index?: number;
          is_default?:  boolean;
          slug?:        string | null;
          created_at?:  string;
          updated_at?:  string;
        };
        Update: {
          name?:        string;
          description?: string | null;
          cover_image?: string | null;
          is_public?:   boolean;
          order_index?: number;
          slug?:        string | null;
          updated_at?:  string;
        };
      };
      shelf_books: {
        Row: {
          id:          string;
          shelf_id:    string;
          source:      string;
          book_id:     string;
          order_index: number;
          created_at:  string;
        };
        Insert: {
          id?:          string;
          shelf_id:    string;
          source:      string;
          book_id:     string;
          order_index?: number;
          created_at?:  string;
        };
        Update: {
          order_index?: number;
        };
      };
      quotes: {
        Row: {
          id:         string;
          user_id:    string;
          source:     string;
          book_id:    string;
          text:       string;
          note:       string | null;
          is_shared:  boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?:         string;
          user_id:    string;
          source:     string;
          book_id:    string;
          text:       string;
          note?:      string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          text?:      string;
          note?:      string | null;
          is_shared?: boolean;
          updated_at?: string;
        };
      };
      journey_events: {
        Row: {
          id:         string;
          user_id:    string;
          event_type: JourneyEventType;
          source:     string | null;
          book_id:    string | null;
          metadata:   Json;
          created_at: string;
        };
        Insert: {
          id?:         string;
          user_id:    string;
          event_type: JourneyEventType;
          source?:    string | null;
          book_id?:   string | null;
          metadata?:  Json;
          created_at?: string;
        };
        Update: {
          event_type?: JourneyEventType;
          metadata?:   Json;
        };
      };
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
    Enums:     Record<string, never>;
  };
}
