# Translations

Each JSON file in this folder is one locale. The filename (without `.json`) is
its BCP 47 language tag, for example `es.json` or `fr-CA.json`. Locale files
are discovered automatically; no registration change is needed.

To add a translation:

1. Copy `en.json` to a new file using the language tag as its filename.
2. Translate each value while keeping all keys, including `lang.name`.
3. Keep interpolation placeholders such as `{name}` and `{count}` unchanged.

The English file is the fallback and must remain present. Keep the same keys in
every locale so all parts of the app can be translated consistently.
