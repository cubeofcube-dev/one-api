# Timezone Handling in One-API

This document describes how timestamps and dates are handled across all frontend templates to ensure proper local timezone display.

## Overview

All timestamps in One-API follow a consistent pattern:
- **Storage**: Backend stores all timestamps as UTC epoch seconds
- **Display**: Frontend displays timestamps in the user's local timezone
- **Input**: Date/time pickers work in the user's local timezone
- **API Calls**: All timestamps sent to the backend are converted to UTC epoch seconds

## Architecture

### Backend (Go)
- All timestamps are stored as `int64` representing Unix epoch seconds in UTC
- Database stores UTC timestamps
- API responses return timestamps as UTC epoch seconds

### Frontend (JavaScript/TypeScript)
- JavaScript's `Date` object automatically converts UTC timestamps to local timezone for display
- HTML5 `datetime-local` inputs work in the user's local timezone
- Date picker libraries (MUI, Semi Design) handle timezone conversion automatically

## Implementation by Template

### Modern Template (React + TypeScript + Vite)

**Location**: `web/modern/src/lib/utils.ts`

**Key Functions**:

```typescript
// Formats UTC timestamp (seconds) for display in local timezone
export function formatTimestamp(timestamp: number): string {
  if (timestamp === undefined || timestamp === null) return '-'
  if (timestamp <= 0) return '-'
  const date = new Date(timestamp * 1000) // Automatically converts to local timezone
  // Returns: YYYY-MM-DD HH:MM:SS in local timezone
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`
}

// Converts UTC timestamp to datetime-local format (for HTML5 inputs)
export function toDateTimeLocal(timestamp: number | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  // Manually format in local timezone for datetime-local input
  // Returns: YYYY-MM-DDTHH:MM
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Converts datetime-local value (in local timezone) to UTC timestamp
export function fromDateTimeLocal(dateTimeLocal: string): number {
  if (!dateTimeLocal) return 0
  // datetime-local input value is already in local timezone
  return Math.floor(new Date(dateTimeLocal).getTime() / 1000)
}
```

**Usage in Components**:

1. **Displaying Timestamps**:
   ```tsx
   import { formatTimestamp } from '@/lib/utils'
   
   // Display created time
   <span>{formatTimestamp(token.created_time)}</span>
   ```

2. **Date Input Fields**:
   ```tsx
   import { toDateTimeLocal, fromDateTimeLocal } from '@/lib/utils'
   
   // When loading data from API
   data.expired_time = toDateTimeLocal(apiData.expired_time)
   
   // When submitting to API
   const timestamp = fromDateTimeLocal(formData.expired_time)
   ```

### Berry Template (React + Material-UI)

**Location**: `web/berry/src/utils/common.js`

**Key Functions**:

```javascript
// Formats UTC timestamp for display in local timezone
export function timestamp2string(timestamp) {
    let date = new Date(timestamp * 1000);
    // Returns: YYYY-MM-DD HH:MM:SS in local timezone
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
}
```

**Date Pickers**: Berry template uses MUI DateTimePicker with dayjs:

```jsx
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// dayjs.unix() automatically handles timezone conversion
<DateTimePicker
  value={filterName.start_timestamp === 0 ? null : dayjs.unix(filterName.start_timestamp)}
  onChange={(value) => {
    handleFilterName({ target: { name: "start_timestamp", value: value.unix() }});
  }}
/>
```

The MUI DateTimePicker with dayjs handles all timezone conversions automatically.

### Default Template (React + Semantic UI)

**Location**: `web/default/src/helpers/utils.js`

**Key Functions**:

```javascript
// Formats UTC timestamp for display in local timezone
export function timestamp2string(timestamp) {
  if (!timestamp || timestamp <= 0 || isNaN(timestamp)) {
    return 'N/A';
  }
  let date = new Date(timestamp * 1000);
  // Returns: YYYY-MM-DD HH:MM:SS in local timezone
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
}
```

**Date Inputs**: Uses HTML5 `datetime-local` inputs:

```jsx
<Form.Input 
  type='datetime-local'
  value={timestamp2string(timestamp)}
  onChange={(e) => {
    // Date.parse() correctly interprets as local timezone
    const localTimestamp = Date.parse(e.target.value) / 1000;
  }}
/>
```

### Air Template (React + Semi Design)

**Location**: `web/air/src/helpers/utils.js`

**Key Functions**:

```javascript
// Same as Default template
export function timestamp2string(timestamp) {
  let date = new Date(timestamp * 1000);
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
}
```

**Date Pickers**: Uses Semi Design's DatePicker:

```jsx
import { Form } from '@douyinfe/semi-ui';

<Form.DatePicker 
  value={timestamp2string(start_timestamp)}
  type="dateTime"
  onChange={value => {
    // Date.parse() correctly interprets as local timezone
    const localTimestamp = Date.parse(value) / 1000;
  }}
/>
```

## Date Range Queries

When querying logs or other data by date range:

1. **Frontend**: User selects dates in their local timezone
2. **Conversion**: Local dates are converted to UTC timestamps before API call
3. **Backend**: Receives UTC timestamps and queries database
4. **Response**: Backend returns UTC timestamps
5. **Display**: Frontend displays results in user's local timezone

### Example (Modern Template)

```typescript
// User inputs (datetime-local in local timezone)
const filters = {
  start_timestamp: '2024-01-15T10:00',  // Local timezone
  end_timestamp: '2024-01-15T18:00'     // Local timezone
}

// Convert to UTC timestamps for API
const startTimestamp = fromDateTimeLocal(filters.start_timestamp)  // UTC seconds
const endTimestamp = fromDateTimeLocal(filters.end_timestamp)      // UTC seconds

// API call with UTC timestamps
await api.get(`/api/log/?start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`)

// Display results with formatTimestamp (auto-converts to local timezone)
logs.map(log => ({
  ...log,
  displayTime: formatTimestamp(log.created_at)  // Shows in local timezone
}))
```

## Testing

### Unit Tests

The Modern template includes comprehensive timezone tests:

```typescript
// web/modern/src/lib/__tests__/utils.test.ts

describe('datetime-local helpers', () => {
  it('toDateTimeLocal returns local timezone format', () => {
    const timestamp = 1705315800  // UTC timestamp
    const result = toDateTimeLocal(timestamp)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('round-trips correctly', () => {
    const original = Math.floor(Date.now() / 1000)
    const local = toDateTimeLocal(original)
    const back = fromDateTimeLocal(local)
    expect(Math.abs(back - original)).toBeLessThanOrEqual(60)
  })
})
```

### Manual Testing

To verify timezone handling:

1. **Set your browser to different timezones** (via browser dev tools or system settings)
2. **Create a token** with an expiration date
3. **Verify the displayed time** matches your local timezone
4. **Check the API payload** uses UTC timestamps
5. **Reload the page** and verify the date still displays correctly

## Common Pitfalls

### ❌ Don't Use `.toISOString()` for datetime-local inputs

```typescript
// WRONG - Returns UTC time, not local time
const date = new Date(timestamp * 1000)
input.value = date.toISOString().slice(0, 16)  // Shows UTC!
```

```typescript
// CORRECT - Use toDateTimeLocal helper
input.value = toDateTimeLocal(timestamp)  // Shows local time
```

### ❌ Don't Manually Add Timezone Offsets

```typescript
// WRONG - Error-prone and breaks across timezones
const offset = new Date().getTimezoneOffset() * 60
const adjustedTimestamp = timestamp - offset
```

```typescript
// CORRECT - Let JavaScript handle timezone conversion
const date = new Date(timestamp * 1000)  // Automatic conversion
```

### ✅ Always Use Helper Functions

Each template provides timezone helper functions. Use them consistently:

- **Modern**: `formatTimestamp()`, `toDateTimeLocal()`, `fromDateTimeLocal()`
- **Berry**: `timestamp2string()` + MUI DateTimePicker with dayjs
- **Default**: `timestamp2string()` + HTML5 datetime-local
- **Air**: `timestamp2string()` + Semi Design DatePicker

## Timezone Assumptions

1. **Server timezone is UTC**: The backend should always operate in UTC
2. **Database stores UTC**: All timestamps in the database are UTC
3. **User prefers local time**: Users want to see times in their local timezone
4. **No manual timezone selection**: Users' browser timezone is used automatically
5. **DST is handled automatically**: JavaScript's Date object handles Daylight Saving Time

## Future Enhancements

Potential improvements for timezone handling:

1. **Explicit timezone display**: Show timezone abbreviation (e.g., "2024-01-15 10:00 PST")
2. **Timezone selection**: Allow users to override browser timezone
3. **Multi-timezone support**: Display times in multiple timezones simultaneously
4. **Relative time**: Show "2 hours ago" in addition to absolute times
5. **UTC toggle**: Quick switch between local time and UTC display

## Debugging

If timestamps display incorrectly:

1. **Check browser timezone**: Verify system time and timezone settings
2. **Verify API response**: Confirm backend returns UTC timestamps
3. **Console log conversions**: Add debug logs for timezone conversions
4. **Test with known timestamps**: Use fixed timestamps like `1705315800` for consistency
5. **Cross-browser test**: Verify behavior in different browsers

## References

- [MDN: Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [MDN: datetime-local input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local)
- [Unix Timestamp](https://www.unixtimestamp.com/)
- [Timezone Database](https://www.iana.org/time-zones)
