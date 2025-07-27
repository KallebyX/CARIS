CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diary_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"entry_date" timestamp DEFAULT now() NOT NULL,
	"mood_rating" integer,
	"intensity_rating" integer,
	"content" text,
	"cycle" text,
	"emotions" text,
	"ai_analyzed" boolean DEFAULT false,
	"dominant_emotion" text,
	"emotion_intensity" integer,
	"sentiment_score" integer,
	"risk_level" text,
	"ai_insights" text,
	"suggested_actions" text,
	"plutchik_categories" text
);
--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"psychologist_id" integer,
	"birth_date" timestamp,
	"current_cycle" text
);
--> statement-breakpoint
CREATE TABLE "psychologist_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"crp" varchar(20),
	"bio" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"psychologist_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"session_date" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" integer NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_psychologist_id_users_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD CONSTRAINT "psychologist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_psychologist_id_users_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;