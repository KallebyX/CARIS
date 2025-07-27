CREATE TABLE "meditation_audio_ratings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"audio_id" text NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meditation_audios" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category_id" text NOT NULL,
	"duration" integer NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"instructor" varchar(255) NOT NULL,
	"audio_url" text NOT NULL,
	"thumbnail_url" text,
	"transcript" text,
	"guided_steps" text,
	"benefits" text,
	"techniques" text,
	"preparation_steps" text,
	"tags" text,
	"language" varchar(10) DEFAULT 'pt-BR' NOT NULL,
	"file_size" integer,
	"format" varchar(10) DEFAULT 'mp3' NOT NULL,
	"bitrate" integer,
	"sample_rate" integer,
	"source_url" text,
	"license" varchar(100) NOT NULL,
	"attribution" text,
	"is_commercial_use" boolean DEFAULT false NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"average_rating" integer DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"moderation_notes" text,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"last_modified_by" integer
);
--> statement-breakpoint
CREATE TABLE "meditation_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(10) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meditation_track_audios" (
	"track_id" text NOT NULL,
	"audio_id" text NOT NULL,
	"week" integer NOT NULL,
	"day" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"unlock_conditions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meditation_tracks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category_id" text NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"week_number" integer NOT NULL,
	"theme" varchar(255) NOT NULL,
	"objective" text NOT NULL,
	"thumbnail_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"enrollment_count" integer DEFAULT 0 NOT NULL,
	"completion_count" integer DEFAULT 0 NOT NULL,
	"average_rating" integer DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "user_meditation_favorites" (
	"user_id" integer NOT NULL,
	"audio_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_track_progress" (
	"user_id" integer NOT NULL,
	"track_id" text NOT NULL,
	"current_week" integer DEFAULT 1 NOT NULL,
	"current_day" integer DEFAULT 1 NOT NULL,
	"completed_audios" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"rating" integer,
	"feedback" text
);
--> statement-breakpoint
ALTER TABLE "meditation_audio_ratings" ADD CONSTRAINT "meditation_audio_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_audio_ratings" ADD CONSTRAINT "meditation_audio_ratings_audio_id_meditation_audios_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."meditation_audios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_audios" ADD CONSTRAINT "meditation_audios_category_id_meditation_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."meditation_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_audios" ADD CONSTRAINT "meditation_audios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_audios" ADD CONSTRAINT "meditation_audios_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_track_audios" ADD CONSTRAINT "meditation_track_audios_track_id_meditation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."meditation_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_track_audios" ADD CONSTRAINT "meditation_track_audios_audio_id_meditation_audios_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."meditation_audios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_tracks" ADD CONSTRAINT "meditation_tracks_category_id_meditation_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."meditation_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meditation_tracks" ADD CONSTRAINT "meditation_tracks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meditation_favorites" ADD CONSTRAINT "user_meditation_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meditation_favorites" ADD CONSTRAINT "user_meditation_favorites_audio_id_meditation_audios_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."meditation_audios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_track_progress" ADD CONSTRAINT "user_track_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_track_progress" ADD CONSTRAINT "user_track_progress_track_id_meditation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."meditation_tracks"("id") ON DELETE no action ON UPDATE no action;