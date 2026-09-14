// Dynamic Learning Module — supports admin-created courses with content items.
//
// This route fetches both:
// 1. Published admin-created courses (from course_content_items)
// 2. Traditional enrolled courses (from course_modules)
const express = require('express');
const { query, sql } = require('../db');
const { requireVisible } = require('../middleware/auth');
const { isAdmin } = require('../lib/visibility');

const router = express.Router();

// Fetch all published admin-created courses with their content items
const PUBLISHED_COURSES_SQL = sql({
  pg: `
  SELECT tc.id, tc.course_code, tc.title, tc.short_description, tc.description,
         tc.course_type, tc.delivery_mode, tc.duration_hours, tc.difficulty,
         tc.cover_image_url, tc.category, tc.instructor_name, tc.created_at,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id',                cci.id,
                    'content_type',      cci.content_type,
                    'title',             cci.title,
                    'description',       cci.description,
                    'display_order',     cci.display_order,
                    'video_url',         cci.video_url,
                    'image_url',         cci.image_url,
                    'pdf_url',           cci.pdf_url,
                    'text_content',      cci.text_content,
                    'external_url',      cci.external_url,
                    'duration_minutes',  cci.duration_minutes)
                  ORDER BY cci.display_order)
           FROM course_content_items cci
           WHERE cci.course_id = tc.id
         ), '[]'::json) AS content_items
  FROM training_courses tc
  WHERE tc.is_admin_created = $1 AND tc.status = $2
  ORDER BY tc.created_at DESC`,
  mssql: `
  SELECT tc.id, tc.course_code, tc.title, tc.short_description, tc.description,
         tc.course_type, tc.delivery_mode, tc.duration_hours, tc.difficulty,
         tc.cover_image_url, tc.category, tc.instructor_name, tc.created_at,
         COALESCE((
           SELECT cci.id                AS id,
                  cci.content_type       AS content_type,
                  cci.title              AS title,
                  cci.description        AS description,
                  cci.display_order      AS display_order,
                  cci.video_url          AS video_url,
                  cci.image_url          AS image_url,
                  cci.pdf_url            AS pdf_url,
                  cci.text_content       AS text_content,
                  cci.external_url       AS external_url,
                  cci.duration_minutes   AS duration_minutes
           FROM course_content_items cci
           WHERE cci.course_id = tc.id
           ORDER BY cci.display_order
           FOR JSON PATH, INCLUDE_NULL_VALUES
         ), '[]') AS content_items
  FROM training_courses tc
  WHERE tc.is_admin_created = $1 AND tc.status = $2
  ORDER BY tc.created_at DESC`,
});

// Parse JSON columns returned from the database
function parseCoursesJson(rows) {
  const toArray = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.length > 0) {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  for (const row of rows) {
    row.content_items = toArray(row.content_items);
  }
  return rows;
}

// GET /api/learning-module/dynamic/published-courses
// Returns all published admin-created courses for display in Learning Module
router.get('/published-courses', async (req, res, next) => {
  try {
    const { rows } = await query(PUBLISHED_COURSES_SQL, [true, 'Published']);
    res.json(parseCoursesJson(rows));
  } catch (err) {
    next(err);
  }
});

// GET /api/learning-module/dynamic/course/:courseId
// Get single course with all content items
router.get('/course/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const SINGLE_COURSE_SQL = sql({
      pg: `
      SELECT tc.id, tc.course_code, tc.title, tc.short_description, tc.description,
             tc.course_type, tc.delivery_mode, tc.duration_hours, tc.difficulty,
             tc.cover_image_url, tc.category, tc.instructor_name, tc.created_at,
             COALESCE((
               SELECT json_agg(json_build_object(
                        'id',                cci.id,
                        'content_type',      cci.content_type,
                        'title',             cci.title,
                        'description',       cci.description,
                        'display_order',     cci.display_order,
                        'video_url',         cci.video_url,
                        'image_url',         cci.image_url,
                        'pdf_url',           cci.pdf_url,
                        'text_content',      cci.text_content,
                        'external_url',      cci.external_url,
                        'duration_minutes',  cci.duration_minutes)
                      ORDER BY cci.display_order)
               FROM course_content_items cci
               WHERE cci.course_id = tc.id
             ), '[]'::json) AS content_items
      FROM training_courses tc
      WHERE tc.is_admin_created = $1 AND tc.status = $2 AND tc.id = $3`,
      mssql: `
      SELECT tc.id, tc.course_code, tc.title, tc.short_description, tc.description,
             tc.course_type, tc.delivery_mode, tc.duration_hours, tc.difficulty,
             tc.cover_image_url, tc.category, tc.instructor_name, tc.created_at,
             COALESCE((
               SELECT cci.id                AS id,
                      cci.content_type       AS content_type,
                      cci.title              AS title,
                      cci.description        AS description,
                      cci.display_order      AS display_order,
                      cci.video_url          AS video_url,
                      cci.image_url          AS image_url,
                      cci.pdf_url            AS pdf_url,
                      cci.text_content       AS text_content,
                      cci.external_url       AS external_url,
                      cci.duration_minutes   AS duration_minutes
               FROM course_content_items cci
               WHERE cci.course_id = tc.id
               ORDER BY cci.display_order
               FOR JSON PATH, INCLUDE_NULL_VALUES
             ), '[]') AS content_items
      FROM training_courses tc
      WHERE tc.is_admin_created = $1 AND tc.status = $2 AND tc.id = $3`,
    });
    
    const { rows } = await query(SINGLE_COURSE_SQL, [true, 'Published', courseId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.json(parseCoursesJson(rows)[0]);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
