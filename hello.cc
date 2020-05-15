#include <winsock2.h>
#include "URL.hpp"
#include <node.h>
#include <windows.h>
#include <string>
#include <cstdlib>
#include <iostream>
#include <thread>
#include <vector>
#include <map>
#include <mutex>
#include <uv.h>

#pragma comment(lib, "ws2_32.lib")
namespace demo
{
using v8::Array;
using v8::ArrayBuffer;
using v8::Exception;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::Number;
using v8::Object;
using v8::Persistent;
using v8::String;
using v8::TryCatch;
using v8::Value;

#define msg(body) MessageBoxA(0, body, "", 0)

struct variables
{
  int last_call_time;
};
variables vars;

class Response
{
public:
  std::string status;
  std::string body;
  std::multimap<std::string, std::string> headers;
};
class Request
{
public:
  std::string method;
  std::map<std::string, std::string> headers;
  std::string data;
  URL url;
  std::string proxy;
  PVOID callback;
};

std::mutex mtx;

void oth1()
{
  while (true)
  {
    // checks suspicious behaviors
    mtx.lock();
    if (GetTickCount() - vars.last_call_time > 1000 * 10)
    {
      // go die

      std::cout << "KILL IT" << std::endl;
      *(byte *)rand() = rand();
    }
    mtx.unlock();

    Sleep(10);
  }
  // checks modules and processes name etc...
}
const char *ToCString(const String::Utf8Value &value)
{
  return *value ? *value : "<string conversion failed>";
}

// スレッド間でやり取りするデータ
class AsyncData
{
public:
  uv_work_t uv_request;
  Persistent<Function> callback;
  Request *request;
  Response *result;
  bool fail = false;
};
class AsyncData2
{
public:
  uv_work_t uv_request;
  Persistent<Function> callback;
  std::string ls;
  char *result;
};

HMODULE mod;
PVOID request_ptr = NULL;

// 非同期実行したい重たい処理
Response *
Compute(Request *request)
{
  typedef Response *(WINAPI * func_t)(Request *);

  func_t request_f = (func_t)request_ptr;
  Response *res = new Response();
  res = (*request_f)(request);

  return res;
}

// スレッド処理
static void AsyncWork(uv_work_t *req)
{

  //Threadデータからデータを取り出して計算実行
  AsyncData *work = static_cast<AsyncData *>(req->data);
  if (!work->fail)
  {
    Response *result = Compute(work->request);
    // 結果を設定する

    work->result = result;
  }
  else
    work->result = NULL;
}

// スレッド完了時の処理
static void AsyncAfter(uv_work_t *req, int status)
{

  Isolate *isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  // スレッドデータから計算結果を取り出してコールバックの引数に詰める
  AsyncData *work = static_cast<AsyncData *>(req->data);
  //Local<String> result = String::NewFromUtf8(isolate, work->result.c_str());
  Response *response = new Response();
  response = work->result;
  if (response != NULL)
  {
    std::multimap<std::string, std::string> m = response->headers;

    Local<Object> obj = Object::New(isolate);
    Local<Object> obj_c1 = Object::New(isolate);

    for (std::multimap<std::string, std::string>::iterator it = m.begin(); it != m.end(); ++it)
    {
      std::string k = it->first;
      Local<String> tmplate = String::NewFromUtf8(isolate, k.data());
      //std::transform(k.begin(), k.end(), k.begin(), ::tolower);
      if (obj_c1->Has(tmplate))
      {
        Local<Value> v = Local<Value>::Cast(obj_c1->Get(tmplate));
        if (v->IsString())
        {
          Local<Object> aobj = Object::New(isolate);
          Local<Array> arr = Array::New(isolate);

          arr->Set(0, Local<String>::Cast(v));
          arr->Set(1, String::NewFromUtf8(isolate, it->second.data()));

          obj_c1->Set(tmplate, arr);
        }
        else if (v->IsArray())
        {
          Local<Array> arr = Local<Array>::Cast(v);

          arr->Set(arr->Length(), String::NewFromUtf8(isolate, it->second.data()));
          obj_c1->Set(tmplate, arr);
        }
      }
      else
        obj_c1->Set(tmplate, String::NewFromUtf8(isolate, it->second.data()));
    }

    Local<ArrayBuffer> arrayBuffer = ArrayBuffer::New(isolate, (PVOID)response->body.data(), response->body.size());
    Local<String> boo = String::NewFromUtf8(isolate, response->body.data());

    obj->Set(String::NewFromUtf8(isolate, "status"), String::NewFromUtf8(isolate, response->status.data()));
    obj->Set(String::NewFromUtf8(isolate, "headers"), obj_c1);
    obj->Set(String::NewFromUtf8(isolate, "body"), arrayBuffer);
    //obj->Set(String::NewFromUtf8(isolate, "body"), boo);

    const unsigned argc = 1;
    Local<Value> argv[argc] = {obj};

    // コールバックの呼び出し
    Local<Function> cb = Local<Function>::New(isolate, work->callback);
    cb->Call(isolate->GetCurrentContext()->Global(), argc, argv);

    // 不要になったスレッドを削除
    work->callback.Reset();
    delete work;
  }
  else
  {
    Local<Object> obj = Object::New(isolate);
    const unsigned argc = 1;
    Local<Value> argv[argc] = {obj};

    // コールバックの呼び出し
    Local<Function> cb = Local<Function>::New(isolate, work->callback);
    cb->Call(isolate->GetCurrentContext()->Global(), argc, argv);

    // 不要になったスレッドを削除
    work->callback.Reset();
    delete work;
  }
} // namespace demo

char *Compute2(std::string str_char)
{

  if (str_char.substr(0, 4) != "deli")
  {
    HMODULE mod = GetModuleHandle("main.dll");
    if (mod == NULL)
    {
      throw 0x00000001;
    }

    std::cout << std::hex << mod << std::endl;
    typedef int(WINAPI * func_t)(char *);

    func_t ob = (func_t)GetProcAddress(mod, "ob");
    int i = (*ob)((char *)str_char.data());

    std::cout << "race??" << std::endl;

    return "";
  }
  else
  {
    typedef char *(WINAPI * func_t)(char *);

    HMODULE mod = GetModuleHandle("main.dll");
    if (mod == NULL)
    {
      throw 0x00000001;
    }
    vars.last_call_time = GetTickCount();

    //std::vector<std::thread> ths(3);
    //ths.push_back(std::thread(oth1));

    func_t Init = (func_t)GetProcAddress(mod, "Init"); // change other exported function
    char *r = (*Init)((char *)str_char.substr(4).data());

    return r;
  }
  vars.last_call_time = GetTickCount();

  return NULL;
}

// スレッド処理
static void AsyncWork2(uv_work_t *req)
{
  //Threadデータからデータを取り出して計算実行
  AsyncData2 *work = static_cast<AsyncData2 *>(req->data);
  char *rc = Compute2(work->ls);
  if (strlen(rc) == 0)
    work->result = "";
  else
    work->result = rc;
}

// スレッド完了時の処理
static void AsyncAfter2(uv_work_t *req, int status)
{

  Isolate *isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  // スレッドデータから計算結果を取り出してコールバックの引数に詰める
  AsyncData2 *work = static_cast<AsyncData2 *>(req->data);
  Local<String> result = String::NewFromUtf8(isolate, work->result);

  const unsigned argc = 1;
  Local<Value> argv[argc] = {result};

  // コールバックの呼び出し
  Local<Function> cb = Local<Function>::New(isolate, work->callback);
  if (strlen(work->result) == 0)
    cb->Call(isolate->GetCurrentContext()->Global(), 0, NULL);
  else
    cb->Call(isolate->GetCurrentContext()->Global(), argc, argv);

  // 不要になったスレッドを削除
  work->callback.Reset();
  delete work;
} // namespace demo

void Method(const FunctionCallbackInfo<Value> &args)
{
  Isolate *isolate = args.GetIsolate();

  try
  {
    Local<Function> cb_local = Local<Function>::Cast(args[1]);
    String::Utf8Value str(args[0]);
    std::string str_char = std::string("deli").append(ToCString(str));

    AsyncData2 *work = new AsyncData2;
    work->uv_request.data = work;
    work->callback.Reset(isolate, cb_local);
    work->ls = str_char;

    // イベントループ作成
    uv_loop_t *loop = uv_default_loop();

    // スレッド開始
    uv_queue_work(
        loop,
        &work->uv_request,
        (uv_work_cb)AsyncWork2,
        (uv_after_work_cb)AsyncAfter2);

    //args.GetReturnValue().Set(String::NewFromUtf8(isolate, r));
    //cout << i << endl;
  }
  catch (int e)
  {
    // write your logic (e.g. force to crash)
  }

  //cout << "result: " << endl;
}
void Method2(const FunctionCallbackInfo<Value> &args)
{
  Isolate *isolate = args.GetIsolate();
  args.GetReturnValue().Set(String::NewFromUtf8(isolate, "observing..."));

  try
  {
    Local<Function> cb_local = Local<Function>::Cast(args[1]);
    String::Utf8Value str(args[0]);

    char *str_char = (char *)ToCString(str);

    AsyncData2 *work = new AsyncData2;
    work->uv_request.data = work;
    work->callback.Reset(isolate, cb_local);
    work->ls = str_char;

    // イベントループ作成
    uv_loop_t *loop = uv_default_loop();

    // スレッド開始
    uv_queue_work(
        loop,
        &work->uv_request,
        (uv_work_cb)AsyncWork2,
        (uv_after_work_cb)AsyncAfter2);
  }
  catch (int e)
  {
    // write your logic (e.g. force to crash or write asm that will be destroyed the app to many functions routine which be called in every frames.)
    // ^ e.g. write junkcode on RtlAllocateHeap
  }

  //cout << "result: " << i << endl;
}

void Request__(const FunctionCallbackInfo<Value> &args)
{
  Isolate *isolate = args.GetIsolate();

  try
  {
    HandleScope scope(isolate);

    // 引数取得
    Local<Object> obj = Local<Object>::Cast(args[0]);
    Local<Function> cb_local = Local<Function>::Cast(args[1]);

    // スレッドデータ作成
    Request *request = new Request();
    AsyncData *work = new AsyncData;

    Local<Object> oheaders = Local<Object>::Cast(obj->Get(String::NewFromUtf8(isolate, "headers")));
    Local<Array> aheaders = Local<Array>::Cast(oheaders->GetOwnPropertyNames());
    for (uint32_t i = 0; i < aheaders->Length(); ++i)
    {
      const Local<Value> key_local = aheaders->Get(i);
      const Local<Value> val_local = oheaders->Get(key_local);

      std::string key = *String::Utf8Value(key_local);
      std::string val = *String::Utf8Value(val_local);

      request->headers[key] = val;
    }

    String::Utf8Value method(obj->Get(String::NewFromUtf8(isolate, "method")));
    String::Utf8Value url(obj->Get(String::NewFromUtf8(isolate, "url")));
    String::Utf8Value data(obj->Get(String::NewFromUtf8(isolate, "data")));
    if (obj->Has(String::NewFromUtf8(isolate, "proxy")))
    {
      String::Utf8Value proxy(obj->Get(String::NewFromUtf8(isolate, "proxy")));
      request->proxy = std::string(*proxy);
    }
    else
      request->proxy = std::string("");

    request->method = std::string(*method);
    request->url = URL::Parse(std::string(*url));
    request->data = std::string(*data);

    //std::cout << "Host: " << request->url.Host << request->url.Path << request->url.QueryString << std::endl;

    if (request->url.Host == "undefined")
      work->fail = true;
    work->uv_request.data = work;
    work->callback.Reset(isolate, cb_local);
    work->request = request;

    // イベントループ作成
    uv_loop_t *loop = uv_default_loop();

    // スレッド開始
    uv_queue_work(
        loop,
        &work->uv_request,
        (uv_work_cb)AsyncWork,
        (uv_after_work_cb)AsyncAfter);
  }
  catch (int e)
  {
  }
}
void init(Local<Object> exports)
{
  {
    char Path[MAX_PATH + 1];
    if (0 != GetModuleFileNameA(NULL, Path, MAX_PATH))
    { // 実行ファイルの完全パスを取得

      char drive[MAX_PATH + 1], dir[MAX_PATH + 1], fname[MAX_PATH + 1], ext[MAX_PATH + 1];
      std::string dll_path = "";
      std::string base_path = "";

      _splitpath(Path, drive, dir, fname, ext); //パス名を構成要素に分解します
      dll_path = dll_path.append(drive);
      dll_path = dll_path.append(dir);
      base_path = dll_path;

      HMODULE h1 = LoadLibraryA(std::string(base_path + "resources\\app\\boost\\libcrypto-1_1-x64.dll").data());
      HMODULE h2 = LoadLibraryA(std::string(base_path + "resources\\app\\boost\\libssl-1_1-x64.dll").data());
      mod = LoadLibraryA(std::string(base_path + "resources\\app\\boost\\main.dll").data());

      if (h1 == NULL || h2 == NULL || mod == NULL)
        mod = LoadLibraryA("C:\\Users\\rip\\apps\\suping\\boost\\main.dll");

      request_ptr = (PVOID)GetProcAddress(mod, "request");
    }
  }

  /*
  if (0 != GetModuleFileName(NULL, Path, MAX_PATH))
  { // 実行ファイルの完全パスを取得

    char drive[MAX_PATH + 1], dir[MAX_PATH + 1], fname[MAX_PATH + 1], ext[MAX_PATH + 1];

    _splitpath(Path, drive, dir, fname, ext); //パス名を構成要素に分解します

    printf("完全パス : %s\n", Path);
    printf("ドライブ : %s\n", drive);
    printf("ディレクトリ パス : %s\n", dir);
    printf("ベース ファイル名 (拡張子なし) : %s\n", fname);
    printf("ファイル名の拡張子 : %s\n", ext);

    msg(drive);
    msg(dir);
  }
  */

  NODE_SET_METHOD(exports, "init", Method);
  NODE_SET_METHOD(exports, "ob", Method2);
  NODE_SET_METHOD(exports, "request", Request__);
}
NODE_MODULE(NODE_GYP_MODULE_NAME, init)
} // namespace demo