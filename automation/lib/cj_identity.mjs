const NUMERIC_PID = /^[0-9]{6,40}$/;
const UUID_PID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CJ_PID_JSON_PATTERN = '^(?:[0-9]{6,40}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$';

export function isValidCjPid(value) {
  return typeof value === 'string' && value === value.trim()
    && (NUMERIC_PID.test(value) || UUID_PID.test(value));
}
