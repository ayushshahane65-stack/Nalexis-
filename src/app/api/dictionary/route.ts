import { NextRequest, NextResponse } from "next/server";
import type { WordDefinition } from "@/lib/epub/types";

interface FreeDictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: FreeDictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface FreeDictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface FreeDictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: FreeDictionaryPhonetic[];
  meanings: FreeDictionaryMeaning[];
}

// ── Built-in Lexicon Fallback (Ensures resilience when external API is offline) ──
const BUILTIN_FALLBACK_LEXICON: Record<string, WordDefinition> = {
  vermin: {
    word: "vermin",
    phonetic: "/ˈvɜː.mɪn/",
    partOfSpeech: "noun",
    definition: "Small, noxious, or objectionable animals (such as lice, fleas, or mice) that are difficult to control.",
    example: "He awoke to find himself transformed into a monstrous vermin.",
    synonyms: ["pest", "rodent", "insect", "parasite"],
  },
  monstrous: {
    word: "monstrous",
    phonetic: "/ˈmɒn.strəs/",
    partOfSpeech: "adjective",
    definition: "Having extraordinary and often frightening size, shape, or appearance; shocking and unnatural.",
    example: "He lay on his hard, armour-like back.",
    synonyms: ["gigantic", "grotesque", "unnatural", "hideous"],
  },
  metamorphosis: {
    word: "metamorphosis",
    phonetic: "/ˌmɛt.əˈmɔː.fə.sɪs/",
    partOfSpeech: "noun",
    definition: "A change of the form or nature of a thing or person into a completely different one.",
    example: "The profound metamorphosis shocked his family into retreat.",
    synonyms: ["transformation", "mutation", "transmutation", "conversion"],
  },
  ennui: {
    word: "ennui",
    phonetic: "/ɒnˈwiː/",
    partOfSpeech: "noun",
    definition: "A feeling of listlessness and dissatisfaction arising from a lack of occupation or excitement.",
    example: "An afternoon of quiet domestic ennui settled over the drawing room.",
    synonyms: ["tedium", "boredom", "lethargy", "weariness"],
  },
  serendipity: {
    word: "serendipity",
    phonetic: "/ˌsɛr.ənˈdɪp.ə.ti/",
    partOfSpeech: "noun",
    definition: "The faculty or phenomenon of finding valuable or agreeable things not sought for.",
    example: "A stroke of serendipity guided the reader to the forgotten bookshelf.",
    synonyms: ["fortune", "fluke", "chance", "providence"],
  },
  solitude: {
    word: "solitude",
    phonetic: "/ˈsɒl.ɪ.tjuːd/",
    partOfSpeech: "noun",
    definition: "The state or situation of being alone, often viewed as a peaceful and contemplative condition.",
    example: "He found unexpected sanctuary in the silent solitude of the hotel attic.",
    synonyms: ["seclusion", "isolation", "quiet", "aloneness"],
  },
  sanctuary: {
    word: "sanctuary",
    phonetic: "/ˈsæŋk.tʃʊə.ri/",
    partOfSpeech: "noun",
    definition: "A place of refuge or safety; a sacred, protected space away from worldly demands.",
    example: "The library room became a peaceful sanctuary for reflective study.",
    synonyms: ["refuge", "haven", "shelter", "oasis"],
  },
  labyrinth: {
    word: "labyrinth",
    phonetic: "/ˈlæb.ə.rɪnθ/",
    partOfSpeech: "noun",
    definition: "A complicated irregular network of passages or paths in which it is difficult to find one's way.",
    example: "The vast hall was a labyrinth of grand statues and marble corridors.",
    synonyms: ["maze", "network", "web", "tangle"],
  },
  austere: {
    word: "austere",
    phonetic: "/ɔːˈstɪər/",
    partOfSpeech: "adjective",
    definition: "Severe or strict in manner, attitude, or appearance; having no comforts or luxuries.",
    example: "His attic quarters were austere but possessed an understated elegance.",
    synonyms: ["severe", "spartan", "frugal", "ascetic"],
  },
  melancholy: {
    word: "melancholy",
    phonetic: "/ˈmɛl.ən.kɒl.i/",
    partOfSpeech: "noun",
    definition: "A feeling of pensive sadness, typically with no obvious immediate cause.",
    example: "A soft autumn melancholy hung over the empty garden courtyard.",
    synonyms: ["sorrow", "sadness", "pensiveness", "gloom"],
  },
  ephemeral: {
    word: "ephemeral",
    phonetic: "/ɪˈfɛm.ər.əl/",
    partOfSpeech: "adjective",
    definition: "Lasting for a very short time; transitory and fleeting.",
    example: "The morning light cast ephemeral shadows across the open book.",
    synonyms: ["transitory", "fleeting", "momentary", "brief"],
  },
  quixotic: {
    word: "quixotic",
    phonetic: "/kwɪkˈsɒt.ɪk/",
    partOfSpeech: "adjective",
    definition: "Extremely idealistic; unrealistic and impractical.",
    example: "He embarked upon a quixotic quest to catalog every hall in the House.",
    synonyms: ["idealistic", "visionary", "romantic", "fanciful"],
  },
  troubled: {
    word: "troubled",
    phonetic: "/ˈtrʌb.əld/",
    partOfSpeech: "adjective",
    definition: "Beset by problems or distress; marked by anxiety and restlessness.",
    example: "Gregor Samsa woke from troubled dreams.",
    synonyms: ["anxious", "restless", "distressed", "uneasy"],
  },
  armour: {
    word: "armour",
    phonetic: "/ˈɑː.mər/",
    partOfSpeech: "noun",
    definition: "A tough, protective covering; defensive shell or plating.",
    example: "He lay on his hard, armour-like back.",
    synonyms: ["shield", "casing", "shell", "protective layer"],
  },
  horrible: {
    word: "horrible",
    phonetic: "/ˈhɒr.ə.bəl/",
    partOfSpeech: "adjective",
    definition: "Causing or likely to cause horror; dreadful, shocking, or repulsive.",
    example: "He found himself transformed into a horrible vermin.",
    synonyms: ["dreadful", "awful", "hideous", "frightful"],
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawWord = searchParams.get("word");

  if (!rawWord) {
    return NextResponse.json(
      { error: "Missing required 'word' query parameter." },
      { status: 400 }
    );
  }

  // 1. Sanitize: Strip surrounding punctuation, trim, lowercase
  const cleanWord = rawWord
    .replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, "")
    .trim()
    .toLowerCase();

  // 2. Strict Validation: Single English / Latin-script word only
  if (
    cleanWord.length === 0 ||
    cleanWord.length > 45 ||
    /\s/.test(cleanWord) ||
    !/^[a-zA-Z\u00C0-\u024F'-]+$/.test(cleanWord)
  ) {
    return NextResponse.json(
      {
        error: "Please select a single valid word to look up.",
        word: rawWord.slice(0, 30),
      },
      { status: 400 }
    );
  }

  // 3. Call Free Dictionary API with reasonable timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      // Check if fallback lexicon has this word before returning 404
      if (BUILTIN_FALLBACK_LEXICON[cleanWord]) {
        return NextResponse.json(BUILTIN_FALLBACK_LEXICON[cleanWord], {
          status: 200,
          headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
        });
      }

      return NextResponse.json(
        {
          error: `No definition found for "${cleanWord}". Check the spelling or select another word.`,
          word: cleanWord,
          notFound: true,
        },
        { status: 404 }
      );
    }

    if (!response.ok) {
      // If server error on external API, check fallback
      if (BUILTIN_FALLBACK_LEXICON[cleanWord]) {
        return NextResponse.json(BUILTIN_FALLBACK_LEXICON[cleanWord], {
          status: 200,
          headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
        });
      }

      return NextResponse.json(
        {
          error: "The dictionary service encountered an issue. Please try again.",
          word: cleanWord,
          retryable: true,
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as FreeDictionaryEntry[];

    if (!Array.isArray(data) || data.length === 0) {
      if (BUILTIN_FALLBACK_LEXICON[cleanWord]) {
        return NextResponse.json(BUILTIN_FALLBACK_LEXICON[cleanWord], {
          status: 200,
          headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
        });
      }

      return NextResponse.json(
        {
          error: `No definition found for "${cleanWord}".`,
          word: cleanWord,
          notFound: true,
        },
        { status: 404 }
      );
    }

    const firstEntry = data[0];

    const phonetic =
      firstEntry.phonetic ||
      firstEntry.phonetics?.find((p) => p.text && p.text.trim().length > 0)?.text ||
      undefined;

    const audioUrl = firstEntry.phonetics?.find(
      (p) => p.audio && p.audio.trim().length > 0
    )?.audio;

    let primaryMeaning: FreeDictionaryMeaning | undefined = undefined;
    let primaryDefinition: FreeDictionaryDefinition | undefined = undefined;

    for (const meaning of firstEntry.meanings || []) {
      if (meaning.definitions && meaning.definitions.length > 0) {
        primaryMeaning = meaning;
        primaryDefinition = meaning.definitions[0];
        break;
      }
    }

    if (!primaryDefinition) {
      if (BUILTIN_FALLBACK_LEXICON[cleanWord]) {
        return NextResponse.json(BUILTIN_FALLBACK_LEXICON[cleanWord], {
          status: 200,
          headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
        });
      }

      return NextResponse.json(
        {
          error: `No clear definition available for "${cleanWord}".`,
          word: cleanWord,
          notFound: true,
        },
        { status: 404 }
      );
    }

    const synSet = new Set<string>();
    if (Array.isArray(primaryDefinition.synonyms)) {
      primaryDefinition.synonyms.forEach((s) => synSet.add(s));
    }
    if (primaryMeaning && Array.isArray(primaryMeaning.synonyms)) {
      primaryMeaning.synonyms.forEach((s) => synSet.add(s));
    }
    for (const m of firstEntry.meanings) {
      for (const d of m.definitions) {
        if (d.synonyms) d.synonyms.forEach((s) => synSet.add(s));
      }
    }

    const synonyms = Array.from(synSet)
      .filter((s) => s.toLowerCase() !== cleanWord)
      .slice(0, 5);

    const result: WordDefinition = {
      word: firstEntry.word || cleanWord,
      phonetic,
      partOfSpeech: primaryMeaning?.partOfSpeech || "word",
      definition: primaryDefinition.definition,
      example: primaryDefinition.example || undefined,
      synonyms: synonyms.length > 0 ? synonyms : undefined,
      audioUrl: audioUrl || undefined,
    };

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    clearTimeout(timeoutId);

    // If external call timed out or network is unreachable, check fallback lexicon
    if (BUILTIN_FALLBACK_LEXICON[cleanWord]) {
      return NextResponse.json(BUILTIN_FALLBACK_LEXICON[cleanWord], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
      });
    }

    return NextResponse.json(
      {
        error: `Could not reach the dictionary service for "${cleanWord}". Please check connection and retry.`,
        word: cleanWord,
        retryable: true,
      },
      { status: 504 }
    );
  }
}
