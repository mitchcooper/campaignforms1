# API CRUD Test Plan for Form Templates

## Test Cases

### 1. POST /api/forms - Create Form

**Valid Request:**
```json
{
  "title": "Test Vendor Inquiry",
  "description": "Please fill out this form",
  "template": "# Test Form\n\n## Information\n\n### Name\n- field: name\n- required: true",
  "isActive": true
}
```

**Expected Response (201):**
```json
{
  "id": "form-xxx",
  "title": "Test Vendor Inquiry",
  "description": "Please fill out this form",
  "template": "# Test Form\n...",
  "ast": { ... },
  "htmlPreview": "<form>...</form>",
  "version": 1,
  "isActive": true,
  "createdAt": "2024-10-22T...",
  "updatedAt": "2024-10-22T..."
}
```

**Invalid Request (missing template):**
```json
{
  "title": "Test Form",
  "description": "Missing template"
}
```

**Expected Response (400):**
```json
{
  "error": ["Template is required"]
}
```

**Invalid Template (missing title):**
```json
{
  "title": "Test",
  "template": "### Field\n- field: test\n- required: true"
}
```

**Expected Response (400):**
```json
{
  "error": "Invalid form template",
  "details": [
    { "line": 0, "message": "Form must have a title (# Title)" }
  ]
}
```

---

### 2. GET /api/forms - List All Forms

**Request:**
```
GET /api/forms
```

**Expected Response (200):**
```json
[
  {
    "id": "form-123",
    "title": "Vendor Inquiry",
    "description": "...",
    "template": "# Vendor Inquiry\n...",
    "ast": { ... },
    "htmlPreview": "<form>...</form>",
    "version": 1,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### 3. GET /api/forms/:id - Get Single Form

**Request:**
```
GET /api/forms/form-123
```

**Expected Response (200):**
Same as list item above

**Not Found (404):**
```
GET /api/forms/nonexistent
```

**Expected Response:**
```json
{
  "error": "Form not found"
}
```

---

### 4. PATCH /api/forms/:id - Update Form

**Request:**
```json
{
  "title": "Updated Title",
  "template": "# Updated\n\n## New Section\n\n### Field\n- field: field1\n- required: true",
  "isActive": false
}
```

**Expected Response (200):**
```json
{
  "id": "form-123",
  "title": "Updated Title",
  "template": "# Updated\n...",
  "ast": { ... },
  "htmlPreview": "<form>...</form>",
  "version": 2,
  "isActive": false,
  "updatedAt": "2024-10-22T..."
}
```

**Invalid Update (bad template):**
```json
{
  "template": "### Field\n- field: test"
}
```

**Expected Response (400):**
```json
{
  "error": "Invalid form template",
  "details": [...]
}
```

---

### 5. DELETE /api/forms/:id - Delete Form

**Request:**
```
DELETE /api/forms/form-123
```

**Expected Response (204):**
No content

**Verify Deleted:**
```
GET /api/forms/form-123
```

**Expected Response (404):**
```json
{
  "error": "Form not found"
}
```

---

## Testing Issues to Check

1. ✓ POST creates form with compiled AST and htmlPreview
2. ✓ GET lists all forms
3. ✓ GET :id retrieves single form
4. ✓ PATCH updates and recompiles template
5. ✓ PATCH invalidates cache
6. ✓ DELETE removes form
7. ✓ Schema validation on POST
8. ✓ Template validation on POST/PATCH
9. ✓ Error handling for invalid templates
10. ✓ Error handling for not found

---

## Frontend Integration Tests

### FormDialog (form-dialog.tsx)
- [ ] Sends title + description + template
- [ ] Handles success response
- [ ] Navigates to builder on create
- [ ] Shows error toast on failure

### FormBuilder (form-builder.tsx)
- [ ] Loads form from API
- [ ] Sends PATCH on save
- [ ] Includes ast in payload
- [ ] Shows success toast
- [ ] Shows error toast

### Forms List (forms.tsx)
- [ ] Fetches all forms
- [ ] Displays in table
- [ ] Can edit (navigate to builder)
- [ ] Can delete with confirmation
- [ ] Can toggle active status

### Vendor Form (vendor-form.tsx)
- [ ] Resolves link token
- [ ] Gets formAST from response
- [ ] Renders form
- [ ] Submits with data
- [ ] Shows success/error

---

## Test Results

Run these tests to verify the system works:

```bash
# Test 1: Create a form
curl -X POST http://localhost:5000/api/forms \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Form",
    "description": "Test",
    "template": "# Test\n\n## Section\n\n### Name\n- field: name\n- required: true",
    "isActive": true
  }'

# Test 2: List forms
curl http://localhost:5000/api/forms

# Test 3: Get single form
curl http://localhost:5000/api/forms/{form-id}

# Test 4: Update form
curl -X PATCH http://localhost:5000/api/forms/{form-id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "template": "# Updated\n\n## New\n\n### Field\n- field: test\n- required: true"
  }'

# Test 5: Delete form
curl -X DELETE http://localhost:5000/api/forms/{form-id}
```

