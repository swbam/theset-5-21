export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      artists: {
        Row: {
          id: string
          name: string
          image_url: string | null
          spotify_id: string | null
          followers: number | null
          popularity: number | null
          genres: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url?: string | null
          spotify_id?: string | null
          followers?: number | null
          popularity?: number | null
          genres?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          image_url?: string | null
          spotify_id?: string | null
          followers?: number | null
          popularity?: number | null
          genres?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          email: string | null
          created_at: string
          updated_at: string | null
          is_admin: boolean | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string | null
          is_admin?: boolean | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string | null
          is_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      setlist_songs: {
        Row: {
          id: string
          setlist_id: string
          name: string
          position: number
          artist_id: string
          votes: number
          created_at: string
        }
        Insert: {
          id?: string
          setlist_id: string
          name: string
          position: number
          artist_id: string
          votes?: number
          created_at?: string
        }
        Update: {
          id?: string
          setlist_id?: string
          name?: string
          position?: number
          artist_id?: string
          votes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_songs_artist_id_fkey"
            columns: ["artist_id"]
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          }
        ]
      }
      setlists: {
        Row: {
          id: string
          artist_id: string
          date: string
          venue: string
          venue_city: string
          tour_name: string | null
          setlist_fm_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          date: string
          venue: string
          venue_city: string
          tour_name?: string | null
          setlist_fm_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          date?: string
          venue?: string
          venue_city?: string
          tour_name?: string | null
          setlist_fm_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlists_artist_id_fkey"
            columns: ["artist_id"]
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      shows: {
        Row: {
          id: string
          artist_id: string
          date: string
          venue: string
          city: string
          ticket_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          date: string
          venue: string
          city: string
          ticket_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          date?: string
          venue?: string
          city?: string
          ticket_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_artist_id_fkey"
            columns: ["artist_id"]
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      user_artists: {
        Row: {
          id: string
          user_id: string
          artist_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          artist_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          artist_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_artists_artist_id_fkey"
            columns: ["artist_id"]
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_votes: {
        Row: {
          id: string
          user_id: string
          setlist_song_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          setlist_song_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          setlist_song_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_setlist_song_id_fkey"
            columns: ["setlist_song_id"]
            referencedRelation: "setlist_songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_votes: {
        Args: { song_id: string; user_id: string }
        Returns: { success: boolean; message: string }
      }
      seed_artists: {
        Args: { artist_data: Json }
        Returns: Json
      }
      seed_shows: {
        Args: { shows_data: Json }
        Returns: Json
      }
      seed_setlists: {
        Args: { setlists_data: Json }
        Returns: Json
      }
      seed_setlist_songs: {
        Args: { songs_data: Json }
        Returns: Json
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