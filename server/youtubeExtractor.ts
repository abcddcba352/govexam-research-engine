import { youtubeId, type YoutubeSource } from './youtubeDiscovery.ts';
import { extractSyllabusFromNotificationText } from './syllabusExtractor.ts';

export interface StudyMaterialItem {
  material_id: string;
  exam_id?: string;
  type: 'YOUTUBE_VIDEO' | 'DOCUMENT_PDF' | 'STUDY_NOTES';
  title: string;
  source_url: string;
  author_or_channel: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  extracted_topics: string[];
  notes_markdown: string;
  material_links: string[];
  transcript_available: boolean;
  created_at: string;
}

interface GeminiVideoExtractionResult {
  summary?: string;
  core_topics_taught?: string[];
  key_points?: string[];
  study_notes_markdown?: string;
}

/**
 * Uses Google Gemini's multimodal video understanding capability to directly analyze
 * the audio, spoken lecture, visual whiteboard/slides, formulas, and teaching INSIDE the YouTube video.
 * Supports multi-key rotation and automatic 429 rate-limit fallback.
 */
async function extractDeepVideoIntelligenceWithGemini(
  watchUrl: string,
  examQuery?: string
): Promise<GeminiVideoExtractionResult | null> {
  const rawKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_BACKUP_API_KEY,
    ...(process.env.GEMINI_EXTRA_KEYS ? process.env.GEMINI_EXTRA_KEYS.split(',') : [])
  ];
  const apiKeys = [...new Set(rawKeys.filter((k): k is string => Boolean(k && k.trim())).map(k => k.trim()))];

  if (apiKeys.length === 0) {
    console.warn('[YouTubeExtractor] No GEMINI_API_KEY configured.');
    return null;
  }

  const candidateModels = [
    process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash'
  ];
  const models = [...new Set(candidateModels)];

  const prompt = `You are an elite educational AI and government examination researcher.
Analyze the audio, spoken lecture, on-screen text, blackboard/whiteboard notes, formulas, problem-solving methods, and slides INSIDE this YouTube video${examQuery ? ` in the context of: "${examQuery}"` : ''}.
Extract the comprehensive educational content and return a valid JSON object matching this schema:
{
  "summary": "Detailed 2-3 paragraph explanation of what is taught or presented inside this video",
  "core_topics_taught": ["Specific Concept or Unit 1", "Specific Concept or Unit 2", "Specific Concept or Unit 3"],
  "key_points": [
    "Important factual point, rule, or syllabus unit explained in the video",
    "Formula, equation, or methodology demonstrated on screen",
    "Historical event, constitutional article, case law, or exam data taught"
  ],
  "study_notes_markdown": "Full formatted markdown study material notes summarizing the entire lecture content with headings, bullet points, formulas, definitions, and key takeaways for candidate exam preparation."
}

Return ONLY raw JSON, with no markdown formatting around it.`;

  for (const apiKey of apiKeys) {
    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const payload = {
            contents: [
              {
                parts: [
                  {
                    file_data: {
                      file_uri: watchUrl
                    }
                  },
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json'
            }
          };

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.status === 429) {
            console.warn(`[YouTubeExtractor] Gemini rate limit hit (429) on model ${model} (attempt ${attempt}).`);
            if (attempt === 1) {
              // Wait 1.5s for burst limit to cool down before retry
              await new Promise(resolve => setTimeout(resolve, 1500));
              continue;
            }
            // Move to next model or key on persistent 429
            break;
          }

          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.warn(`[YouTubeExtractor] Gemini model ${model} returned status ${res.status}: ${errBody.slice(0, 200)}`);
            break;
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            try {
              const parsed = JSON.parse(text);
              return {
                summary: parsed.summary,
                core_topics_taught: Array.isArray(parsed.core_topics_taught) ? parsed.core_topics_taught : [],
                key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
                study_notes_markdown: parsed.study_notes_markdown
              };
            } catch {
              return {
                study_notes_markdown: text
              };
            }
          }
        } catch (err) {
          console.warn(`[YouTubeExtractor] Error querying Gemini model ${model}:`, err);
          break;
        }
      }
    }
  }

  return null;
}

export async function extractYoutubeVideoIntelligence(rawUrl: string, examQuery?: string): Promise<StudyMaterialItem> {
  const id = youtubeId(rawUrl);
  if (!id) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube watch, Shorts, or youtu.be link.');
  }

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  let title = 'YouTube Video Analysis';
  let author = 'YouTube Educator';
  let thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  let description = '';
  let durationSeconds = 0;
  let transcript = '';
  let transcriptAvailable = false;
  const materialLinks: string[] = [];

  // 1. Fetch public oEmbed for verified title, author, and thumbnail (<200ms)
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) author = oembed.author_name;
      if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
    }
  } catch (err) {
    console.warn('[YouTubeExtractor] oEmbed fetch error:', err);
  }

  // 2. Fetch watch page HTML to extract duration, description, chapters, and captions
  try {
    const pageRes = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract description
      const descMatch = html.match(/"shortDescription":"([\s\S]*?)"/);
      if (descMatch) {
        try {
          description = JSON.parse(`"${descMatch[1]}"`);
        } catch {
          description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      } else {
        const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
        if (metaDescMatch) description = metaDescMatch[1];
      }

      // Extract lengthSeconds
      const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
      if (lenMatch) durationSeconds = parseInt(lenMatch[1], 10);

      // Extract caption tracks if available
      const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionsMatch) {
        try {
          const tracks = JSON.parse(captionsMatch[1]);
          if (Array.isArray(tracks) && tracks.length > 0) {
            const chosenTrack = tracks.find((t: any) => t.languageCode === 'en' || t.languageCode === 'te' || t.languageCode === 'hi') || tracks[0];
            if (chosenTrack?.baseUrl) {
              const capRes = await fetch(chosenTrack.baseUrl);
              if (capRes.ok) {
                const xml = await capRes.text();
                const textMatches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
                if (textMatches.length > 0) {
                  transcript = textMatches
                    .map(m => m[1])
                    .join(' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\s+/g, ' ')
                    .trim();
                  if (transcript.length > 50) {
                    transcriptAvailable = true;
                  }
                }
              }
            }
          }
        } catch (capErr) {
          console.warn('[YouTubeExtractor] Caption extraction error:', capErr);
        }
      }
    }
  } catch (pageErr) {
    console.warn('[YouTubeExtractor] Watch page fetch error:', pageErr);
  }

  // 3. Scan for Google Drive, Telegram, PDF, and notes links inside description
  if (description) {
    const rawLinks = description.match(/https?:\/\/[^\s<>"']+/g) || [];
    for (const link of rawLinks) {
      if (/drive\.google\.com|t\.me|telegram\.me|\.pdf|dropbox\.com|mediafire\.com/i.test(link)) {
        if (!materialLinks.includes(link)) materialLinks.push(link);
      }
    }
  }

  // 4. Parse timestamps / chapters from description (e.g. "01:25 Topic Name")
  const timestampMatches = [...description.matchAll(/(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–:]?\s*([^\n\r]+)/g)];
  const chapters = timestampMatches.map(m => ({ time: m[1].trim(), label: m[2].trim() }));

  // 5. DEEP INSIDE-VIDEO MULTIMODAL INTELLIGENCE VIA GEMINI API
  // Directly reads and understands what is spoken, written on blackboard/slides, and taught inside the video
  const deepVideoIntel = await extractDeepVideoIntelligenceWithGemini(watchUrl, examQuery);
  if (deepVideoIntel) {
    transcriptAvailable = true;
  }

  // 6. Gather all topics
  const combinedTopicsSet = new Set<string>();
  if (deepVideoIntel?.core_topics_taught && deepVideoIntel.core_topics_taught.length > 0) {
    deepVideoIntel.core_topics_taught.forEach(t => {
      const clean = t.trim();
      if (clean) combinedTopicsSet.add(clean);
    });
  }

  // Also extract topics from text/description using regex extractor as supplementary
  const fullTextContent = `${title}\n\n${description}\n\n${transcript ? 'VIDEO TRANSCRIPT:\n' + transcript : ''}`;
  const extractedSyllabus = extractSyllabusFromNotificationText(fullTextContent, examQuery || title);
  if (extractedSyllabus.syllabus_topics.length > 0) {
    extractedSyllabus.syllabus_topics.forEach(t => combinedTopicsSet.add(t));
  }

  const finalTopics = Array.from(combinedTopicsSet);

  // 7. Synthesize high-yield Structured Study Material Notes (Markdown)
  let notes = `### 🎥 ${title}\n\n`;
  notes += `**Educator / Channel**: ${author}\n`;
  if (durationSeconds > 0) {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    notes += `**Duration**: ${mins}m ${secs}s\n`;
  }
  notes += `**Source Video**: [Watch on YouTube](${watchUrl})\n\n`;

  // Include inside video lecture summary
  if (deepVideoIntel?.summary) {
    notes += `#### 🧠 What is Taught Inside This Video\n`;
    notes += `${deepVideoIntel.summary.trim()}\n\n`;
  }

  // Include key formulas, rules, and facts demonstrated in the video
  if (deepVideoIntel?.key_points && deepVideoIntel.key_points.length > 0) {
    notes += `#### 🎯 Key Points, Formulas & Exam Takeaways\n`;
    deepVideoIntel.key_points.forEach(point => {
      notes += `- ${point.trim()}\n`;
    });
    notes += `\n`;
  }

  // Include detailed lecture revision notes
  if (deepVideoIntel?.study_notes_markdown) {
    notes += `#### 📖 Comprehensive Lecture Revision Notes\n`;
    notes += `${deepVideoIntel.study_notes_markdown.trim()}\n\n`;
  }

  // Include chapters
  if (chapters.length > 0) {
    notes += `#### ⏱️ Video Chapters & Topic Outline\n`;
    chapters.slice(0, 15).forEach(c => {
      notes += `- **${c.time}** — ${c.label}\n`;
    });
    notes += `\n`;
  }

  // Include topics
  if (finalTopics.length > 0) {
    notes += `#### 📚 Syllabus & Core Conceptual Units\n`;
    finalTopics.slice(0, 15).forEach((topic, i) => {
      notes += `${i + 1}. **${topic}**\n`;
    });
    notes += `\n`;
  }

  // Include downloadable drive / study material links
  if (materialLinks.length > 0) {
    notes += `#### 📥 Downloadable Study Material & Drive Links\n`;
    materialLinks.forEach(link => {
      notes += `- [${link.length > 60 ? link.slice(0, 60) + '...' : link}](${link})\n`;
    });
    notes += `\n`;
  }

  // Include original educator description if no deep intel was available or as reference
  if (!deepVideoIntel) {
    notes += `> ℹ️ *Note: AI Multimodal video analysis quota was temporarily busy or reached. Content generated from verified Video Captions, Timestamps, and Lecture Materials.*\n\n`;
    if (description) {
      const cleanedDesc = description.slice(0, 800).trim();
      notes += `#### 📝 Educator Description & Notes\n`;
      notes += `${cleanedDesc}${description.length > 800 ? '...' : ''}\n\n`;
    }
  }

  // Spoken transcript highlight if available
  if (transcript && !deepVideoIntel) {
    notes += `#### 🎙️ Spoken Transcript Highlights\n`;
    notes += `> ${transcript.slice(0, 600)}...\n\n`;
  }

  return {
    material_id: `yt_mat_${id}_${Date.now().toString(36)}`,
    type: 'YOUTUBE_VIDEO',
    title,
    source_url: watchUrl,
    author_or_channel: author,
    thumbnail_url: thumbnail,
    duration_seconds: durationSeconds,
    extracted_topics: finalTopics,
    notes_markdown: notes,
    material_links: materialLinks,
    transcript_available: transcriptAvailable,
    created_at: new Date().toISOString()
  };
}

