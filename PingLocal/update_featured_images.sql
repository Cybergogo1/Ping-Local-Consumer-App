-- Update featured_image column for offers 70-81
-- Extracts the URL string from the JSON object

UPDATE offers
SET featured_image = featured_image->>'url'
WHERE id BETWEEN 70 AND 81;

-- Verify the update
SELECT id, name, featured_image
FROM offers
WHERE id BETWEEN 70 AND 81;
