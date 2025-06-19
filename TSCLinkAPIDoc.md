# **TSC Link API Documentation**

## **Setup**

A token is required to upload files to **TSC Online**. This token must be included in the **request header**.

 **Note**: In the `.env` file, do **not** wrap the token in quotes or brackets.

---

## **TSC Online**

If everything is set up correctly, no changes are needed. A **Bearer token** should be stored and accessible via **GitHub Actions**.

If not, create a `.env` file inside the `server` folder with the following format:

BEARER\_TOKEN=your\_token\_here

---

## **External Sites Run by EHV**

For **Geolex-hosted** sites (inside the `/aaron/live` folder), update the `docker-compose` file to include:

env\_file:  
  \- ./.env

Ensure that `./live/.env` exists and includes:

BEARER\_TOKEN=your\_token\_here

This avoids the need for separate `.env` files for each site.

---

## **External Sites Not Run by EHV**

Sites not hosted by Geolex should:

1. Request a **Bearer token** from the organization.  
2. Create a `.env` file with:

BEARER\_TOKEN=your\_token\_here  
---

## **Sending Datapacks**

Include the following **headers** in your request:

| Header | Value | Description |
| ----- | ----- | ----- |
| Authorization | Bearer `<token>` | API token for authentication |
| datapacktitle | Same as title | Used for logging/verification |
| datapackHash | Hash of file | Used for checking duplicate datapacks |

Example:  `Authorization: Bearer sadsajdlksajklkdjkshajdhakjsf`

### **Request Body Fields**

| Field | Type | Description |
| ----- | ----- | ----- |
| datapack | `file` | The `.txt` file to upload |
| title | `string` | Unique title for the datapack |
| description | `string` | Short description |
| authoredBy | `string` | Author’s name (usually `"Treatise"`) |
| isPublic | `"true"/"false"` | Whether the datapack is publicly listed |
| type | `string` | Should be `"official"` |
| uuid | `string` | Should be `"official"` |
| references | `string (JSON)` | JSON array of reference strings, e.g. `[]` |
| tags | `string (JSON)` | JSON array of tags, e.g. `["Treatise", "Lexicon Formations"]` |
| hasFiles | `"true"/"false"` | `"false"` if only the main datapack is included |

### **Tag Guidelines**

Use the following tags for Treatise and Geolex/OneStrat datapacks respectively:

* `["Treatise"]`  
* `["Lexicon Formations", "OneStratigraphy"]`

These determine how datapacks appear under their respective sections in TSC Online. All others show as official datapacks.

Successful uploads should return a response containing ‘datapackTitle’ that will be needed to view the chart later.

---

## **Viewing Charts**

After a successful upload, view the chart at:

**`https://tsconline.timescalecreator.org/generate-external-chart/?datapackTitle=`**

In the URL, other parameters may be included.

### **GET Parameters**

| Parameter | Type | Required | Description |
| ----- | ----- | ----- | ----- |
| datapackTitle | `string` | ✅ | Exact title of the uploaded datapack. Use the returned response from uploading the datapack. |
| chartConfig | `string` | ⛔ | Use `"Internal"` to include TSC Online  internal datapack |
| baseVal | `float` | ⛔ | Base unit value (default: 10); must be greater than `topVal` |
| topVal | `float` | ⛔ | Top unit value (default: 0); must be less than `baseVal` |
| unitStep | `float` | ⛔ | Step interval between units (default: 0.1) |
| unitType | `string` | ⛔ | Unit label (default: `"Ma"`); use geologic units or alternatives like `"m"` |
| minMaxPlot | `string` | ⛔ | Format: `minTotal-maxTotal-minNew-maxNew-minExtinct-maxExtinct` |

---

## **Code Examples**

Refer to:

* `TSCLinkAPI.php` (in Treatise sites)

* `sendTSCOnlineDatapack.php` (in the main Geolex site)

