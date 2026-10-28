-- Supabase Storage: contenitore pubblico di sola LETTURA per i video destinati
-- all'ingestione delle API social. Nessun upload anonimo autorizzato.
-- I media saranno pubblici soltanto DOPO upload esplicito di file con diritti verificati.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('rmp-social-videos','rmp-social-videos',true,50000000,ARRAY['video/mp4','video/quicktime']::text[])
ON CONFLICT(id) DO NOTHING;