const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

export const DEMO_MODE = parseBoolean(process.env.REACT_APP_DEMO_MODE, true);

