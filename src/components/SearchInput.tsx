import { useNavigate } from "react-router-dom";

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: SearchInputProps) {
  const navigate = useNavigate();

  const hasHighlightedSuggestion = false;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !hasHighlightedSuggestion) {
      navigate(`/catalog?query=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}

export default SearchInput;
