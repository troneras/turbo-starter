CREATE TABLE "brand_locales" (
	"brand_id" integer NOT NULL,
	"locale_id" integer NOT NULL,
	CONSTRAINT "brand_locales_brand_id_locale_id_pk" PRIMARY KEY("brand_id","locale_id")
);
--> statement-breakpoint
ALTER TABLE "brand_locales" ADD CONSTRAINT "brand_locales_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_locales" ADD CONSTRAINT "brand_locales_locale_id_locales_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."locales"("id") ON DELETE no action ON UPDATE no action;