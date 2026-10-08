import {
  AlignLeft,
  Calendar,
  ChevronDown,
  CreditCard,
  Gauge,
  Globe,
  Grid3x3,
  Hash,
  Image,
  ListChecks,
  ListOrdered,
  Mail,
  MapPin,
  Phone,
  Quote,
  Star,
  TextCursorInput,
  ToggleRight,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { LogicOp, Question, QuestionType } from "@/types/form";

/** Front-end half of the question-type registry (the backend has the authoritative validators). */
export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  icon: LucideIcon;
  /** Pastel badge colours, like Typeform's question icons. */
  bg: string;
  fg: string;
  category: Category;
  defaults: () => Pick<Question, "settings" | "options">;
}

export type Category = "Contact info" | "Choice" | "Rating & ranking" | "Text & Video" | "Other";

export const newId = () => crypto.randomUUID();

const CONTACT = { bg: "#FCE1EA", fg: "#9B2C55" };
const CHOICE = { bg: "#E9DFFB", fg: "#5B32A8" };
const TEXT = { bg: "#DCEBFF", fg: "#1F4E99" };
const RATING = { bg: "#D7F0D2", fg: "#2F6B2A" };
const OTHER = { bg: "#FFEBC2", fg: "#8A5A00" };

const options = (...labels: string[]) => labels.map((label) => ({ id: newId(), label }));

export const QUESTION_REGISTRY: Record<QuestionType, QuestionTypeMeta> = {
  short_text: {
    type: "short_text", label: "Short Text", icon: TextCursorInput, ...TEXT, category: "Text & Video",
    defaults: () => ({ settings: {}, options: [] }),
  },
  long_text: {
    type: "long_text", label: "Long Text", icon: AlignLeft, ...TEXT, category: "Text & Video",
    defaults: () => ({ settings: {}, options: [] }),
  },
  email: {
    type: "email", label: "Email", icon: Mail, ...CONTACT, category: "Contact info",
    defaults: () => ({ settings: { placeholder: "name@example.com" }, options: [] }),
  },
  number: {
    type: "number", label: "Number", icon: Hash, ...OTHER, category: "Other",
    defaults: () => ({ settings: {}, options: [] }),
  },
  multiple_choice: {
    type: "multiple_choice", label: "Multiple Choice", icon: ListChecks, ...CHOICE, category: "Choice",
    defaults: () => ({ settings: { allow_multiple: false }, options: options("Choice 1", "Choice 2") }),
  },
  dropdown: {
    type: "dropdown", label: "Dropdown", icon: ChevronDown, ...CHOICE, category: "Choice",
    defaults: () => ({ settings: {}, options: options("Option 1", "Option 2", "Option 3") }),
  },
  yes_no: {
    type: "yes_no", label: "Yes/No", icon: ToggleRight, ...CHOICE, category: "Choice",
    defaults: () => ({ settings: {}, options: [] }),
  },
  rating: {
    type: "rating", label: "Rating", icon: Star, ...RATING, category: "Rating & ranking",
    defaults: () => ({ settings: { steps: 5, shape: "star" }, options: [] }),
  },
  file_upload: {
    type: "file_upload", label: "File Upload", icon: Upload, ...OTHER, category: "Other",
    defaults: () => ({ settings: { max_size_mb: 10 }, options: [] }),
  },
};

/** Which logic-jump comparisons each type supports (mirrors the backend registry). */
export const LOGIC_OPS: Partial<Record<QuestionType, LogicOp[]>> = {
  multiple_choice: ["is", "is_not"],
  dropdown: ["is", "is_not"],
  yes_no: ["is", "is_not"],
  rating: ["is", "is_not", "gt", "lt"],
  number: ["is", "is_not", "gt", "lt"],
};

export const hasOptions = (type: QuestionType) => type === "multiple_choice" || type === "dropdown";

export function createQuestion(type: QuestionType): Question {
  return { id: newId(), type, title: "", description: "", required: false, logic: [], ...QUESTION_REGISTRY[type].defaults() };
}

/** Types shown in the picker but not implemented (assignment allows "Coming soon"). */
export interface ComingSoonType {
  label: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
  category: Category;
}

export const COMING_SOON_TYPES: ComingSoonType[] = [
  { label: "Phone Number", icon: Phone, ...CONTACT, category: "Contact info" },
  { label: "Address", icon: MapPin, ...CONTACT, category: "Contact info" },
  { label: "Website", icon: Globe, ...CONTACT, category: "Contact info" },
  { label: "Picture Choice", icon: Image, ...CHOICE, category: "Choice" },
  { label: "Video and Audio", icon: Quote, ...TEXT, category: "Text & Video" },
  { label: "Statement", icon: Quote, ...TEXT, category: "Text & Video" },
  { label: "Opinion Scale", icon: Gauge, ...RATING, category: "Rating & ranking" },
  { label: "Ranking", icon: ListOrdered, ...RATING, category: "Rating & ranking" },
  { label: "Matrix", icon: Grid3x3, ...RATING, category: "Rating & ranking" },
  { label: "Date", icon: Calendar, ...OTHER, category: "Other" },
  { label: "Payment", icon: CreditCard, ...OTHER, category: "Other" },
];

export const CATEGORIES: Category[] = ["Contact info", "Choice", "Rating & ranking", "Text & Video", "Other"];
