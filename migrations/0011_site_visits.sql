CREATE TABLE site_visit_counts (
 country TEXT PRIMARY KEY,
 visit_count INTEGER NOT NULL DEFAULT 0 CHECK(visit_count>=0)
);
CREATE TABLE site_visit_events (
 event_id TEXT PRIMARY KEY,
 country TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX site_visit_events_expiry ON site_visit_events(created_at);
CREATE TRIGGER site_visit_event_insert AFTER INSERT ON site_visit_events BEGIN
 INSERT INTO site_visit_counts(country,visit_count) VALUES(NEW.country,1)
 ON CONFLICT(country) DO UPDATE SET visit_count=visit_count+1;
END;
