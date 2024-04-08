# EverCache 使用文書

## はじめに

EverCacheは、IndexedDBを基盤にして構築された効率的で使いやすいキャッシュライブラリです。localStorageと比べて、EverCacheは非同期操作、より大きなストレージ空間、複雑なデータタイプとの互換性をサポートしています。
EverCacheは、setItemやgetItemなどの特定のメソッドを呼び出す必要なく、キー名を直接使用してデータの保存と取得ができます。

```javascript
import { storage } from "ever-cache";

storage.myKey = { name: 'John', age: 30 };
// 次と同等
// await storage.setItem('myKey', { name: 'John', age: 30 });

const data = await storage.myKey;
// 次と同等
// const data = await storage.getItem('myKey');
```

EverCacheのコードは簡潔で効率的で、圧縮後のファイルサイズは2KB未満です。これにより、プロジェクトに軽量なキャッシュ解決策を提供します。

## インストール

EverCacheはnpmパッケージマネージャーを介してインストールするか、ブラウザのネイティブESModule構文を直接使って導入することができます。

### npmによるインストール

```bash
npm install ever-cache
```

### ブラウザでESModuleを直接参照する

```html
<script type="module">
  import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";
</script>
```

## はじめての使用

### EverCacheインスタンスを初期化する

```javascript
import { storage } from "ever-cache"; // npmを使った場合、nodejsがサポートされている環境でwebプロジェクトに使用
// または
import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // ブラウザのESModule機能を使用
```

### データの保存

`setItem`メソッドを使用してキャッシュにデータを保存します。

```javascript
async function saveData() {
  storage.myKey = { name: 'John', age: 30 };
  // または
  await storage.setItem('myKey', { name: 'John', age: 30 });

  console.log('データが正常に保存されました！');
}

saveData();
```

### データの取得

`getItem`メソッドを使用して、キー名に基づいて保存されたデータを取得します。

```javascript
async function fetchData() {
  const data = await storage.myKey;
  // または
  const data = await storage.getItem('myKey');

  console.log('取得したデータ:', data);
}

fetchData();
```

### データの削除

`removeItem`メソッドを使用して、指定されたキー名のデータを削除します。

```javascript
async function deleteData() {
  delete storage.myKey;
  // または
  await storage.removeItem('myKey');

  console.log('データが正常に削除されました！');
}

deleteData();
```

### すべてのデータをクリア

`clear`メソッドを使用して、キャッシュ内のすべてのデータをクリアします。

```javascript
async function clearData() {
  await storage.clear();

  console.log('すべてのデータがクリアされました！');
}

clearData();
```

### データキーの取得

`key`メソッドを使用して、キャッシュ内のすべてのデータのキーを取得します。

```javascript
async function firstKeys() {
  const firstKey = await storage.key(0); // 最初のキーを取得
  console.log('最初のキー:', firstKey);
}

firstKeys();
```

### データ長の取得

`length`プロパティを使用して、キャッシュに保存されたキーバリューペアの数を取得します。

```javascript
const count = await storage.length;
console.log('アイテム数:', count);
```

### データの反復処理

entries()、keys()、values()メソッドを使用して、キャッシュ内のデータを反復処理します。

```javascript
(async()=>{
  for await (let [key, value] of storage.entries()) {
    console.log(key, value);
  }
  // for await (let key of storage.keys()) {
  //   console.log(key);
  // }
  // for await (let item of storage.values()) {
  //   console.log(item);
  // }
})();
```

## 高度な使い方

### ストレージ名のカスタマイズ

EverCacheのインスタンスを生成し、ユニークなストレージ名を指定することで、独立したキャッシュ空間を作成することができます。

```javascript
import { EverCache } from "ever-cache"; // npmを使った場合、nodejsがサポートされている環境
// または
import { EverCache } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // ブラウザのネイティブESModuleを使用

const customStorage = new EverCache('custom-name');
```

生成されたcustomStorageインスタンスは、storageと同じメソッドと機能を提供します。

## 注意事項

- EverCacheの操作はPromiseに基づいています。そのため、非同期操作を処理するためには`async/await`または`.then()`と`.catch()`を使用する必要があります。
- あなたのブラウザがIndexedDBをサポートしていることを確認してください。ほとんどの現代のブラウザはサポートしていますが、一部の古いブラウザでは利用できません。
- キー名を直接使用してデータの保存と取得に問題が発生した場合、setItemとgetItemメソッドを使用する代替的な解決策を試してみてください。