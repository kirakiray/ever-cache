# EverCache 사용 설명서

## 소개

EverCache는 IndexedDB를 기반으로 한 효율적이고 사용하기 쉬운 캐시 라이브러리입니다. localStorage와 비교하여 EverCache는 비동기 작업, 더 큰 저장 공간, 복잡한 데이터 유형에 대한 호환성을 지원합니다.
EverCache는 setItem 또는 getItem 메서드를 호출할 필요 없이 키 이름을 직접 사용하여 데이터를 저장하고 검색할 수 있습니다.

```javascript
import { storage } from "ever-cache";

storage.myKey = { name: 'John', age: 30 };
// 다음과 동일
// await storage.setItem('myKey', { name: 'John', age: 30 });

const data = await storage.myKey;
// 다음과 동일
// const data = await storage.getItem('myKey');
```

EverCache의 코드는 간결하고 효율적이며, 압축된 파일 크기가 2KB 미만으로 프로젝트에 가벼운 캐시 솔루션을 제공합니다.

## 설치

EverCache는 npm 패키지 관리자를 통해 설치하거나, 브라우저의 원시 ESModule 구문을 직접 사용하여 도입할 수 있습니다.

### npm 설치

```bash
npm install ever-cache
```

### 브라우저에서 ESModule 직접 참조

```html
<script type="module">
  import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";
</script>
```

## 빠른 시작

### EverCache 인스턴스 초기화

```javascript
import { storage } from "ever-cache"; // npm 설치 후, nodejs가 지원되는 환경에서 웹 프로젝트에 사용
// 또는
import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // 브라우저의 ESModule 기능 사용
```

### 데이터 저장

`setItem` 메서드를 사용하여 캐시에 데이터를 저장합니다.

```javascript
async function saveData() {
  storage.myKey = { name: 'John', age: 30 };
  // 또는
  await storage.setItem('myKey', { name: 'John', age: 30 });

  console.log('데이터가 성공적으로 저장되었습니다!');
}

saveData();
```

### 데이터 검색

`getItem` 메서드를 사용하여 키 이름으로 저장된 데이터를 검색합니다.

```javascript
async function fetchData() {
  const data = await storage.myKey;
  // 또는
  const data = await storage.getItem('myKey');

  console.log('검색된 데이터:', data);
}

fetchData();
```

### 데이터 삭제

`removeItem` 메서드를 사용하여 지정된 키 이름의 데이터를 삭제합니다.

```javascript
async function deleteData() {
  delete storage.myKey;
  // 또는
  await storage.removeItem('myKey');

  console.log('데이터가 성공적으로 삭제되었습니다!');
}

deleteData();
```

### 모든 데이터 지우기

`clear` 메서드를 사용하여 캐시 내의 모든 데이터를 지웁니다.

```javascript
async function clearData() {
  await storage.clear();

  console.log('모든 데이터가 지워졌습니다!');
}

clearData();
```

### 데이터 키 얻기

`key` 메서드를 사용하여 캐시 내 모든 데이터의 키를 얻습니다.

```javascript
async function firstKeys() {
  const firstKey = await storage.key(0); // 첫 번째 키를 얻습니다
  console.log('첫 번째 키:', firstKey);
}

firstKeys();
```

### 데이터 길이 쿼리

`length` 속성을 사용하여 캐시에 저장된 키-값 쌍의 수를 얻습니다.

```javascript
const count = await storage.length;
console.log('항목 수:', count);
```

### 데이터 반복

entries(), keys(), values() 메서드를 사용하여 캐시 내의 데이터를 반복합니다.

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

## 고급 사용법

### 저장소 이름 사용자 정의

EverCache의 인스턴스를 생성하고 유일한 저장소 이름을 지정함으로써 독립적인 캐시 공간을 만들 수 있습니다.

```javascript
import { EverCache } from "ever-cache"; // npm 설치 후, nodejs 패키저 환경에서 사용
// 또는
import { EverCache } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // 브라우저의 원시 ESModule 사용

const customStorage = new EverCache('custom-name');
```

생성된 customStorage 인스턴스는 storage와 동일한 메서드와 기능을 제공합니다.

## 주의 사항

- EverCache 작업은 Promise를 기반으로 합니다. 따라서 비동기 작업을 처리하기 위해서는 `async/await` 또는 `.then()`와 `.catch()`를 사용해야 합니다.
- 브라우저가 IndexedDB를 지원하는지 확인하십시오. 대부분의 현대 브라우저는 지원하지만 일부 오래된 브라우저에서는 사용할 수 없습니다.
- 키 이름을 직접 사용하여 데이터를 저장하고 검색할 때 문제가 발생하는 경우, setItem과 getItem 메서드를 사용하는 대체적인 해결 방법을 시도해 보십시오.