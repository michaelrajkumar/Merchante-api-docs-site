import type { CodeSample } from '@/components/CodeSampleTabs'

function toFormPairs(payload: any): Array<[string, string]> {
  if (!payload || typeof payload !== 'object') return []
  return Object.entries(payload)
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(([k, v]) => [String(k), typeof v === 'string' ? v : JSON.stringify(v)])
}

function guessBaseUrl(servers: any[] | undefined): string {
  if (Array.isArray(servers)) {
    // Prefer an explicit cert/testing server if present.
    const cert = servers.find((s) => typeof s?.url === 'string' && s.url.includes('cert.'))
    if (cert?.url) return cert.url

    const first = servers.find((s) => typeof s?.url === 'string')
    if (first?.url) {
      // If it's templated (e.g., https://{environment}.merchante-solutions.com/...), keep it templated.
      // We'll substitute {environment} client-side so code samples can switch between cert/api.
      if (typeof first.url === 'string' && first.url.includes('{environment}')) {
        return first.url
      }
      return first.url
    }
  }

  // Default to templated base so the UI can swap environment values.
  return 'https://{environment}.merchante-solutions.com/mes-api/tridentApi'
}

function escapeQuotes(s: string) {
  return String(s).replace(/"/g, '\\"')
}

function goEscape(s: string) { return s.replaceAll('\\\\', '\\\\\\\\').replaceAll('"', '\\"') }

function pyEscape(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function rbEscape(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function jsEscape(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function javaEscape(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function phpEscape(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function csEscape(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function jsKey(k: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `"${jsEscape(k)}"`
}

export function buildFormPostSamples(opts: {
  servers?: any[]
  /** Real upstream path. For MerchantE gateway this is always /transaction. */
  endpointPath?: string
  payloadExample?: any
}): CodeSample[] {
  const base = guessBaseUrl(opts.servers)
  const endpointPath = opts.endpointPath || '/transaction'
  const url = `${base.replace(/\/$/, '')}${endpointPath}`

  const pairs = toFormPairs(opts.payloadExample)

  const curl =
    `curl -X POST "${url}" \\\n  -H "Content-Type: application/x-www-form-urlencoded"` +
    (pairs.length
      ? ` \\\n  ${pairs
        .map(([k, v]) => `--data-urlencode "${escapeQuotes(k)}=${escapeQuotes(v)}"`)
        .join(' \\\n  ')}`
      : '')

  const python = `import requests

url = "${url}"
payload = {
${pairs.map(([k, v]) => `    "${pyEscape(k)}": "${pyEscape(v)}",`).join('\n')}
}

resp = requests.post(url, data=payload)
print(resp.status_code)
print(resp.text)
`

  const ruby = `require "net/http"
require "uri"

uri = URI("${url}")
params = {
${pairs.map(([k, v]) => `  "${rbEscape(k)}" => "${rbEscape(v)}",`).join('\n')}
}

res = Net::HTTP.post_form(uri, params)
puts res.code
puts res.body
`

  const javascript = `const url = "${url}";

const params = new URLSearchParams({
${pairs.map(([k, v]) => `  ${jsKey(k)}: "${jsEscape(v)}",`).join('\n')}
});

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: params
});

console.log(res.status);
console.log(await res.text());
`

  const php = `<?php
$url = "${url}";

$data = [
${pairs.map(([k, v]) => `  "${phpEscape(k)}" => "${phpEscape(v)}",`).join('\n')}
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/x-www-form-urlencoded"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo $status . "\n";
echo $response;
?>
`

  const go = `package main

import (
  "fmt"
  "io"
  "net/http"
  "net/url"
  "strings"
)

func main() {
  endpoint := "${url}"

  data := url.Values{}
${pairs.map(([k, v]) => `  data.Set("${javaEscape(k)}", "${javaEscape(v)}")`).join('\n')}

  req, err := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
  if err != nil { panic(err) }
  req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

  res, err := http.DefaultClient.Do(req)
  if err != nil { panic(err) }
  defer res.Body.Close()

  body, _ := io.ReadAll(res.Body)
  fmt.Println(res.StatusCode)
  fmt.Println(string(body))
}
`

  const csharp = `using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
  static async Task Main()
  {
    var url = "${url}";
    using var http = new HttpClient();

    var data = new Dictionary<string, string>
    {
${pairs.map(([k, v]) => `      ["${csEscape(k)}"] = "${csEscape(v)}",`).join('\n')}
    };

    using var content = new FormUrlEncodedContent(data);
    var res = await http.PostAsync(url, content);
    var body = await res.Content.ReadAsStringAsync();

    Console.WriteLine((int)res.StatusCode);
    Console.WriteLine(body);
  }
}
`

  const java = `// OkHttp example
import okhttp3.*;

OkHttpClient client = new OkHttpClient();

FormBody body = new FormBody.Builder()
${pairs.map(([k, v]) => `    .add("${javaEscape(k)}", "${javaEscape(v)}")`).join('\n')}
    .build();

Request request = new Request.Builder()
    .url("${url}")
    .post(body)
    .build();

try (Response response = client.newCall(request).execute()) {
  System.out.println(response.code());
  System.out.println(response.body().string());
}
`

  return [
    { key: 'curl', label: 'cURL', code: curl },
    { key: 'python', label: 'Python', code: python },
    { key: 'ruby', label: 'Ruby', code: ruby },
    { key: 'javascript', label: 'JavaScript', code: javascript },
    { key: 'php', label: 'PHP', code: php },
    { key: 'go', label: 'Go', code: go },
    { key: 'csharp', label: 'C#', code: csharp },
    { key: 'java', label: 'Java', code: java },
  ]
}


export function buildMultipartPostSamples(opts: {
  baseUrl: string
  endpointPath: string
  /** key/value fields (excluding file) */
  fields?: Record<string, string>
  fileFieldName?: string
  filePlaceholder?: string
}): CodeSample[] {
  const base = opts.baseUrl || 'https://www.merchante-solutions.com/srv/api'
  const url = `${base.replace(/\/$/, '')}${opts.endpointPath}`
  const fields = opts.fields || {}
  const fileField = opts.fileFieldName || 'file'
  const filePh = opts.filePlaceholder || './request.txt'

  const formLines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `  -F "${escapeQuotes(k)}=${escapeQuotes(v)}"`)
    .join(' \\\n')

  const curl =
    `curl -X POST "${url}" \\\n  -H "Accept: application/json" \\\n` +
    (formLines ? formLines + ' \\\n' : '') +
    `  -F "${fileField}=@${filePh}"`

  const js = `import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

const url = "${url}";
const form = new FormData();
${Object.entries(fields)
  .map(([k, v]) => `form.append("${jsEscape(k)}", "${jsEscape(v)}");`)
  .join('\n')}
form.append("${jsEscape(fileField)}", fs.createReadStream("${jsEscape(filePh)}"));

const resp = await fetch(url, { method: "POST", body: form });
console.log(resp.status);
console.log(await resp.text());`

  const python = `import requests

url = "${url}"
files = {"${pyEscape(fileField)}": open("${pyEscape(filePh)}", "rb")}
data = {
${Object.entries(fields)
  .map(([k, v]) => `    "${pyEscape(k)}": "${pyEscape(v)}",`)
  .join('\n')}
}

resp = requests.post(url, data=data, files=files)
print(resp.status_code)
print(resp.text)`

  const php = `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${url}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$post = [
${Object.entries(fields).map(([k,v])=>`  "${phpEscape(k)}" => "${phpEscape(v)}",`).join('\n')}
  "${phpEscape(fileField)}" => new CURLFile("${phpEscape(filePh)}")
];

curl_setopt($ch, CURLOPT_POSTFIELDS, $post);

$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo $code . "\n";
echo $response;
?>`

  const go = `package main

import (
  "bytes"
  "fmt"
  "mime/multipart"
  "net/http"
  "os"
)

func main() {
  var b bytes.Buffer
  w := multipart.NewWriter(&b)

${Object.entries(fields).map(([k,v])=>`  _ = w.WriteField("${goEscape(k)}", "${goEscape(v)}")`).join('\n')}

  f, _ := os.Open("${goEscape(filePh)}")
  defer f.Close()
  fw, _ := w.CreateFormFile("${goEscape(fileField)}", "${goEscape(filePh)}")
  _, _ = io.Copy(fw, f)

  w.Close()

  req, _ := http.NewRequest("POST", "${url}", &b)
  req.Header.Set("Content-Type", w.FormDataContentType())
  resp, err := http.DefaultClient.Do(req)
  if err != nil { panic(err) }
  defer resp.Body.Close()
  body, _ := io.ReadAll(resp.Body)
  fmt.Println(resp.StatusCode)
  fmt.Println(string(body))
}
`
  // Note: io import is needed; keep sample minimal but correct.
  const goFixed = go.replace('import (\n', 'import (\n  "io"\n')

  const cs = `using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program {
  static async Task Main() {
    using var client = new HttpClient();
    using var form = new MultipartFormDataContent();
${Object.entries(fields).map(([k,v])=>`    form.Add(new StringContent("${csEscape(v)}"), "${csEscape(k)}");`).join('\n')}
    form.Add(new StreamContent(System.IO.File.OpenRead("${csEscape(filePh)}")), "${csEscape(fileField)}", "${csEscape(filePh)}");

    var resp = await client.PostAsync("${url}", form);
    Console.WriteLine((int)resp.StatusCode);
    Console.WriteLine(await resp.Content.ReadAsStringAsync());
  }
}`

  const ruby = `require "net/http"
require "uri"

uri = URI("${url}")
request = Net::HTTP::Post.new(uri)
form_data = [
${Object.entries(fields).map(([k,v])=>`  ["${rbEscape(k)}", "${rbEscape(v)}"],`).join('\n')}
  ["${rbEscape(fileField)}", File.open("${rbEscape(filePh)}")]
]
request.set_form(form_data, "multipart/form-data")

response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
  http.request(request)
end

puts response.code
puts response.body`

  const java = `// OkHttp multipart example
import okhttp3.*;
import java.io.File;

public class Example {
  public static void main(String[] args) throws Exception {
    OkHttpClient client = new OkHttpClient();

    MultipartBody.Builder form = new MultipartBody.Builder().setType(MultipartBody.FORM)
${Object.entries(fields).map(([k,v])=>`      .addFormDataPart("${javaEscape(k)}", "${javaEscape(v)}")`).join('\n')}
      .addFormDataPart("${javaEscape(fileField)}", "${javaEscape(filePh)}",
        RequestBody.create(new File("${javaEscape(filePh)}"), MediaType.parse("application/octet-stream")));

    Request request = new Request.Builder()
      .url("${url}")
      .post(form.build())
      .build();

    try (Response response = client.newCall(request).execute()) {
      System.out.println(response.code());
      System.out.println(response.body().string());
    }
  }
}`

  return [
    { key: 'curl', label: 'cURL', code: curl },
    { key: 'javascript', label: 'JavaScript', code: js },
    { key: 'python', label: 'Python', code: python },
    { key: 'ruby', label: 'Ruby', code: ruby },
    { key: 'php', label: 'PHP', code: php },
    { key: 'go', label: 'Go', code: goFixed },
    { key: 'csharp', label: 'C#', code: cs },
    { key: 'java', label: 'Java', code: java },
  ]}

export function buildJsonPostSamples(opts: {
  baseUrl: string
  endpointPath: string
  payload?: any
  headers?: Record<string, string>
}): CodeSample[] {
  const base = opts.baseUrl
  const url = `${base.replace(/\/$/, '')}${opts.endpointPath}`
  const payload = opts.payload || {}
  const headers = opts.headers || {}
  const jsonBody = JSON.stringify(payload, null, 2)

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ')

  const curl = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  ${headerLines ? headerLines + ' \\\n  ' : ''}-d '${jsonBody.replace(/'/g, "'\\''")}'`

  const python = `import requests
import json

url = "${url}"
headers = {
    "Content-Type": "application/json",
${Object.entries(headers).map(([k, v]) => `    "${k}": "${v}",`).join('\n')}
}
payload = ${jsonBody}

resp = requests.post(url, headers=headers, json=payload)
print(resp.status_code)
print(resp.json())`

  const javascript = `const url = "${url}";

const headers = {
  "Content-Type": "application/json",
${Object.entries(headers).map(([k, v]) => `  "${k}": "${v}",`).join('\n')}
};

const payload = ${jsonBody};

const res = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify(payload)
});

console.log(res.status);
console.log(await res.json());`

  const ruby = `require "net/http"
require "uri"
require "json"

uri = URI("${url}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == "https"

request = Net::HTTP::Post.new(uri.path)
request["Content-Type"] = "application/json"
${Object.entries(headers).map(([k, v]) => `request["${k}"] = "${v}"`).join('\n')}

request.body = ${jsonBody}.to_json

response = http.request(request)
puts response.code
puts JSON.parse(response.body)`

  const php = `<?php
$url = "${url}";
$payload = json_encode(${jsonBody});

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
${Object.entries(headers).map(([k, v]) => `    "${k}: ${v}",`).join('\n')}
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo $status . "\\n";
echo $response;
?>`

  const go = `package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
)

func main() {
  url := "${url}"
  payload := ${jsonBody}

  jsonData, _ := json.Marshal(payload)
  req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
  req.Header.Set("Content-Type", "application/json")
${Object.entries(headers).map(([k, v]) => `  req.Header.Set("${k}", "${v}")`).join('\n')}

  resp, err := http.DefaultClient.Do(req)
  if err != nil { panic(err) }
  defer resp.Body.Close()

  body, _ := io.ReadAll(resp.Body)
  fmt.Println(resp.StatusCode)
  fmt.Println(string(body))
}`

  const csharp = `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
  static async Task Main()
  {
    var url = "${url}";
    using var http = new HttpClient();

    var payload = JsonSerializer.Serialize(new {
      // Add your payload properties here
    });

    var content = new StringContent(payload, Encoding.UTF8, "application/json");
${Object.entries(headers).map(([k, v]) => `    http.DefaultRequestHeaders.Add("${k}", "${v}");`).join('\n')}

    var res = await http.PostAsync(url, content);
    var body = await res.Content.ReadAsStringAsync();

    Console.WriteLine((int)res.StatusCode);
    Console.WriteLine(body);
  }
}`

  const java = `// OkHttp JSON example
import okhttp3.*;

OkHttpClient client = new OkHttpClient();

String json = """
${jsonBody}
""";

RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));

Request request = new Request.Builder()
    .url("${url}")
    .post(body)
${Object.entries(headers).map(([k, v]) => `    .addHeader("${k}", "${v}")`).join('\n')}
    .build();

try (Response response = client.newCall(request).execute()) {
  System.out.println(response.code());
  System.out.println(response.body().string());
}`

  return [
    { key: 'curl', label: 'cURL', code: curl },
    { key: 'python', label: 'Python', code: python },
    { key: 'javascript', label: 'JavaScript', code: javascript },
    { key: 'ruby', label: 'Ruby', code: ruby },
    { key: 'php', label: 'PHP', code: php },
    { key: 'go', label: 'Go', code: go },
    { key: 'csharp', label: 'C#', code: csharp },
    { key: 'java', label: 'Java', code: java },
  ]
}

export function buildGetQuerySamples(opts: {
  baseUrl: string
  endpointPath: string
  params?: Record<string, string>
}): CodeSample[] {
  const base = opts.baseUrl
  const urlBase = `${base.replace(/\/$/, '')}${opts.endpointPath}`
  const params = opts.params || {}
  const qs = new URLSearchParams(params).toString()
  const url = qs ? `${urlBase}?${qs}` : urlBase

  const curl = `curl -X GET "${url}"`

  const js = `import fetch from "node-fetch";

const resp = await fetch("${url}");
console.log(resp.status);
console.log(await resp.text());`

  const python = `import requests
resp = requests.get("${url}")
print(resp.status_code)
print(resp.text)`

  const ruby = `require "net/http"
require "uri"

uri = URI("${url}")
resp = Net::HTTP.get_response(uri)
puts resp.code
puts resp.body`

  const php = `<?php
$resp = file_get_contents("${url}");
echo $resp;
?>`

  const go = `package main
import (
  "fmt"
  "io"
  "net/http"
)
func main() {
  resp, err := http.Get("${url}")
  if err != nil { panic(err) }
  defer resp.Body.Close()
  b, _ := io.ReadAll(resp.Body)
  fmt.Println(resp.StatusCode)
  fmt.Println(string(b))
}`

  const cs = `using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program {
  static async Task Main() {
    using var client = new HttpClient();
    var resp = await client.GetAsync("${url}");
    Console.WriteLine((int)resp.StatusCode);
    Console.WriteLine(await resp.Content.ReadAsStringAsync());
  }
}`

  const java = `import java.net.*;
import java.net.http.*;

public class Example {
  public static void main(String[] args) throws Exception {
    HttpClient client = HttpClient.newHttpClient();
    HttpRequest request = HttpRequest.newBuilder()
      .uri(new URI("${url}"))
      .GET()
      .build();
    HttpResponse<String> resp = client.send(request, HttpResponse.BodyHandlers.ofString());
    System.out.println(resp.statusCode());
    System.out.println(resp.body());
  }
}`

  return [
    { key: 'curl', label: 'cURL', code: curl },
    { key: 'javascript', label: 'JavaScript', code: js },
    { key: 'python', label: 'Python', code: python },
    { key: 'ruby', label: 'Ruby', code: ruby },
    { key: 'php', label: 'PHP', code: php },
    { key: 'go', label: 'Go', code: go },
    { key: 'csharp', label: 'C#', code: cs },
    { key: 'java', label: 'Java', code: java },
  ]}
