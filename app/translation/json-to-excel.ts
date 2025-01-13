import * as fs from "fs";
import * as XLSX from "xlsx";
import * as path from "path";
// File paths
const inputDir = "./translation";
const outputExcelFile = "./translation/translation.xlsx";

type NestedTranslations = {
    [key: string]: string | NestedTranslations;
};

const flattenObject = (obj: NestedTranslations, prefix = ""): Record<string, string> => {
    const flattened: Record<string, string> = {};
    for (const key in obj) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "object" && value !== null) {
            // Recursively flatten nested objects
            Object.assign(flattened, flattenObject(value as NestedTranslations, fullKey));
        } else if (value !== null) {
            // Add non-null values to the flattened object
            flattened[fullKey] = value.toString();
        }
    }
    return flattened;
};

// Read JSON files
const jsonFiles = fs.readdirSync(inputDir).filter(file => file.endsWith(".json"));

const translations: Record<string, Record<string, string>> = {};
jsonFiles.forEach(file => {
    const lang = path.basename(file, ".json");
    const filePath = path.join(inputDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    translations[lang] = flattenObject(data["translation"]);
});

// Combine all translations into a single structure
const combined: Record<string, Record<string, string>> = {};
Object.entries(translations).forEach(([lang, data]) => {
    Object.entries(data).forEach(([key, value]) => {
        if (!combined[key]) {
            combined[key] = {};
        }
        combined[key][lang] = value;
    });
});

// Convert combined translations to an array of rows for Excel
const rows = Object.entries(combined).map(([key, translations]) => ({
    Key: key,
    ...translations
}));

// Write to Excel
const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Translations");
XLSX.writeFile(workbook, outputExcelFile);

console.log(`Excel file generated at ${outputExcelFile}`);
