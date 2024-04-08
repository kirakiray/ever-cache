# Documentación de uso de EverCache

## Introducción

EverCache es una biblioteca de caché eficiente y fácil de usar, construida sobre IndexedDB y proporcionando una interfaz similar a localStorage. En comparación con localStorage, EverCache admite operaciones asíncronas, un espacio de almacenamiento más grande y compatibilidad con tipos de datos más complejos.

A diferencia de otras bibliotecas de terceros similares, EverCache le permite almacenar y recuperar datos directamente a través del nombre de la clave, sin llamar a métodos específicos como setItem o getItem.

```javascript
import { storage } from "ever-cache";

storage.myKey = { name: 'John', age: 30 };
// Equivalente a
// await storage.setItem('myKey', { name: 'John', age: 30 });

const data = await storage.myKey;
// Equivalente a
// const data = await storage.getItem('myKey');
```

El código de EverCache es conciso y eficiente, con un tamaño de archivo comprimido menor a 2KB, proporcionando una solución de caché ligera para su proyecto.

## Instalación

EverCache se puede instalar a través del administrador de paquetes npm o se puede引入 directamente a través de la sintaxis nativa de ESModule del navegador.

### Instalación a través de npm

```bash
npm install ever-cache
```

### Referencia directa a ESModule en el navegador

```html
<script type="module">
  import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";
</script>
```

## Comenzando rápidamente

### Inicialización de la instancia de EverCache

```javascript
import { storage } from "ever-cache"; // Usar después de la instalación con npm, en entornos que soportan nodejs
// O
import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // Usar la función ESModule nativa del navegador
```

### Almacenamiento de datos

Usar el método `setItem` para almacenar datos en la caché.

```javascript
async function saveData() {
  storage.myKey = { name: 'John', age: 30 };
  // o
  await storage.setItem('myKey', { name: 'John', age: 30 });

  console.log('Datos almacenados con éxito!');
}

saveData();
```

### Búsqueda de datos

Usar el método `getItem` para recuperar datos almacenados según la clave.

```javascript
async function fetchData() {
  const data = await storage.myKey;
  // o
  const data = await storage.getItem('myKey');

  console.log('Datos recuperados:', data);
}

fetchData();
```

### Eliminación de datos

Usar el método `removeItem` para eliminar datos con una clave específica.

```javascript
async function deleteData() {
  delete storage.myKey;
  // o
  await storage.removeItem('myKey');

  console.log('Datos eliminados con éxito!');
}

deleteData();
```

### Borrado de todos los datos

Usar el método `clear` para borrar todos los datos en la caché.

```javascript
async function clearData() {
  await storage.clear();

  console.log('Todos los datos han sido borrados!');
}

clearData();
```

### Obtención de las claves de los datos

Usar el método `key` para obtener todas las claves de los datos en la caché.

```javascript
async function firstKeys() {
  const firstKey = await storage.key(0); // Obtener la primera clave
  console.log('Primera clave:', firstKey);
}

firstKeys();
```

### Consulta de la longitud de los datos

Usar la propiedad `length` para obtener la cantidad de pares clave-valor almacenados en la caché.

```javascript
const count = await storage.length;
console.log('Número de elementos:', count);
```

### Iteración de datos

Usar los métodos entries(), keys() y values() para iterar sobre los datos en la caché.

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

## Uso avanzado

### Personalización del nombre de almacenamiento

Puede crear un espacio de caché independiente creando una instancia de EverCache y especificando un nombre de almacenamiento único.

```javascript
import { EverCache } from "ever-cache"; // Después de la instalación con npm, en entornos con empaquetador de nodejs
// o
import { EverCache } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // Usar la funcionalidad nativa de ESModule del navegador

const customStorage = new EverCache('nombre personalizado');
```

La instancia customStorage creada proporcionará los mismos métodos y funcionalidades que storage.

## Precauciones

- Las operaciones de EverCache se basan en Promises, por lo que necesitará usar `async/await` o `.then()` y `.catch()` para manejar operaciones asíncronas.
- Asegúrese de que su navegador admita IndexedDB. La mayoría de los navegadores modernos lo hacen, pero puede no estar disponible en algunas versiones antiguas de navegadores.
- Si encuentra problemas al almacenar y recuperar datos directamente a través de nombres de clave, puede intentar usar los métodos setItem e getItem como soluciones alternativas.