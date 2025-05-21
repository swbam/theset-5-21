export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          created_at: string | null
          followers: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          setlist_fm_mbid: string | null
          spotify_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          followers?: number | null
          genres?: string[] | null
          id: string
          image_url?: string | null
          name: string
          popularity?: number | null
          setlist_fm_mbid?: string | null
          spotify_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          followers?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          setlist_fm_mbid?: string | null
          spotify_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          endpoint: string
          error: string
          id: string
          timestamp: string | null
        }
        Insert: {
          endpoint: string
          error: string
          id?: string
          timestamp?: string | null
        }
        Update: {
          endpoint?: string
          error?: string
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          id: number
          name: string | null
          sql: string | null
        }
        Insert: {
          executed_at?: string | null
          id?: number
          name?: string | null
          sql?: string | null
        }
        Update: {
          executed_at?: string | null
          id?: number
          name?: string | null
          sql?: string | null
        }
        Relationships: []
      }
      setlist_raw_data: {
        Row: {
          artist_id: string | null
          created_at: string | null
          id: string
          raw_data: Json | null
          setlist_id: string | null
          show_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          setlist_id?: string | null
          show_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          setlist_id?: string | null
          show_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_raw_data_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_songs: {
        Row: {
          artist_id: string | null
          created_at: string | null
          id: string
          last_updated: string | null
          name: string
          position: number | null
          setlist_id: string | null
          song_id: string | null
          track_id: string | null
          updated_at: string | null
          vote_count: number | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          name: string
          position?: number | null
          setlist_id?: string | null
          song_id?: string | null
          track_id?: string | null
          updated_at?: string | null
          vote_count?: number | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          name?: string
          position?: number | null
          setlist_id?: string | null
          song_id?: string | null
          track_id?: string | null
          updated_at?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          artist_id: string | null
          created_at: string | null
          date: string | null
          id: string
          setlist_fm_id: string | null
          show_id: string | null
          tour_name: string | null
          updated_at: string | null
          venue: string | null
          venue_city: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          setlist_fm_id?: string | null
          show_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          venue?: string | null
          venue_city?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          setlist_fm_id?: string | null
          show_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          venue?: string | null
          venue_city?: string | null
        }
        Relationships: []
      }
      shows: {
        Row: {
          artist_id: string | null
          created_at: string | null
          date: string | null
          id: string
          image_url: string | null
          last_updated: string | null
          name: string
          popularity: number | null
          status: string | null
          ticket_url: string | null
          updated_at: string | null
          url: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          id: string
          image_url?: string | null
          last_updated?: string | null
          name: string
          popularity?: number | null
          status?: string | null
          ticket_url?: string | null
          updated_at?: string | null
          url?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          name?: string
          popularity?: number | null
          status?: string | null
          ticket_url?: string | null
          updated_at?: string | null
          url?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      songs: {
        Row: {
          artist_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          popularity: number | null
          preview_url: string | null
          spotify_id: string | null
          updated_at: string | null
          vote_count: number | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name: string
          popularity?: number | null
          preview_url?: string | null
          spotify_id?: string | null
          updated_at?: string | null
          vote_count?: number | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name?: string
          popularity?: number | null
          preview_url?: string | null
          spotify_id?: string | null
          updated_at?: string | null
          vote_count?: number | null
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          attempts: number
          created_at: string | null
          entity_id: string
          entity_type: string
          id: number
          operation: string
          payload: Json | null
          priority: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: number
          operation: string
          payload?: Json | null
          priority?: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: number
          operation?: string
          payload?: Json | null
          priority?: string
        }
        Relationships: []
      }
      sync_states: {
        Row: {
          entity_id: string
          entity_type: string
          last_synced: string
          sync_version: number
        }
        Insert: {
          entity_id: string
          entity_type: string
          last_synced?: string
          sync_version?: number
        }
        Update: {
          entity_id?: string
          entity_type?: string
          last_synced?: string
          sync_version?: number
        }
        Relationships: []
      }
      sync_operations: {
        Row: {
          id: string
          task: string
          entity_type: string
          entity_id: string
          parent_task?: string | null
          priority: string
          status: string
          started_at: string
          completed_at?: string | null
          error?: string | null
        }
        Insert: {
          id?: string
          task: string
          entity_type: string
          entity_id: string
          parent_task?: string | null
          priority?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          error?: string | null
        }
        Update: {
          id?: string
          task?: string
          entity_type?: string
          entity_id?: string
          parent_task?: string | null
          priority?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          error?: string | null
        }
        Relationships: []
      }
      top_tracks: {
        Row: {
          album: string | null
          album_id: string | null
          album_image_url: string | null
          artist_id: string
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          popularity: number | null
          preview_url: string | null
          spotify_id: string | null
          spotify_url: string | null
          updated_at: string | null
        }
        Insert: {
          album?: string | null
          album_id?: string | null
          album_image_url?: string | null
          artist_id: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name: string
          popularity?: number | null
          preview_url?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          updated_at?: string | null
        }
        Update: {
          album?: string | null
          album_id?: string | null
          album_image_url?: string | null
          artist_id?: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name?: string
          popularity?: number | null
          preview_url?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tracks: {
        Row: {
          artist_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          popularity: number | null
          preview_url: string | null
          spotify_id: string | null
          spotify_url: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name: string
          popularity?: number | null
          preview_url?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name?: string
          popularity?: number | null
          preview_url?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          external_id: string | null
          id: string
          image_url: string | null
          latitude: string | null
          longitude: string | null
          name: string
          state: string | null
          ticketmaster_id: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          external_id?: string | null
          id: string
          image_url?: string | null
          latitude?: string | null
          longitude?: string | null
          name: string
          state?: string | null
          ticketmaster_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: string | null
          longitude?: string | null
          name?: string
          state?: string | null
          ticketmaster_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          song_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          song_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          song_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "setlist_songs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrement_vote: {
        Args: {
          p_song_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      exec_sql: {
        Args: {
          sql: string
        }
        Returns: undefined
      }
      exec_sql_direct: {
        Args: {
          sql: string
        }
        Returns: undefined
      }
      get_random_artist_songs: {
        Args: {
          artist_uuid: string
          count: number
        }
        Returns: {
          artist_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          popularity: number | null
          preview_url: string | null
          spotify_id: string | null
          updated_at: string | null
          vote_count: number | null
        }[]
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      increment_vote: {
        Args: {
          p_song_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
