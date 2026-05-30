Para dar inicio al desarrollo de nuestro sistema distribuido, mi primera responsabilidad fue construir el corazón del almacenamiento: el db-services. Diseñé este componente bajo una premisa fundamental: el desacoplamiento absoluto. Este servicio es completamente agnóstico; no tiene idea de qué es gRPC, no conoce los archivos .proto ni le interesa la existencia de los futuros nodos de servicio. Es, por definición, un microservicio independiente que expone un API REST clásico mediante HTTP nativo en el puerto :4000 y maneja un almacenamiento volátil en memoria RAM (in-memory).

Siguiendo las pautas de diseño requeridas para garantizar un código modular, reutilizable y limpio, decidí estructurar el proyecto utilizando el paradigma de Programación Orientada a Objetos (Clases), dividiendo el problema en tres capas de responsabilidad única:

1. La Arquitectura de mi Código
Capa de Datos (db.js)
Aquí creé la clase Database. En lugar de conectar una base de datos pesada como PostgreSQL o MongoDB en esta etapa, utilicé un objeto nativo Map de JavaScript. Los mapas son estructuras clave-valor extremadamente rápidas para trabajar en memoria.

Evitando que inicie vacío: Implementé el método privado _cargarMockData(). Al arrancar el servidor, este método inyecta automáticamente 5 registros de prueba preexistentes (Ana, Luis, Sofía, Carlos y María) con sus respectivas cédulas (ci). Así, el sistema tiene datos con los cuales interactuar desde el primer segundo.

Encapsulamiento: La clase expone métodos limpios como getAll(), get(ci), exists(ci), create(), update() y delete(). Si el día de mañana decido cambiar el Map por una base de datos real, solo tendré que modificar este archivo; el resto del sistema ni se enterará.

Capa de Enrutamiento (router.js)
Aquí implementé la clase Router, que funciona como el cerebro lógico de las peticiones. Su trabajo es interceptar los métodos HTTP entrantes y decidir qué hacer:

Lectura y Escritura (GET y POST): Mapea directamente /personas. Para el POST, diseñé un lector de buffers asíncrono (_parseBody) que intercepta los fragmentos de datos binarios que viajan por la red, los unifica y los transforma en un objeto JSON limpio.

Parámetros Dinámicos (PUT y DELETE): Para poder procesar rutas variables como /personas/25111222, configuré una expresión regular (Regex): /^\/personas\/([a-zA-Z0-9]+)$/. Esto me permite extraer limpiamente la cédula directamente desde la URL para buscar, modificar o eliminar de forma quirúrgica en el Map.

Capa de Infraestructura (index.js)
Es la puerta de entrada de mi aplicación. Utilicé exclusivamente el módulo nativo node:http de Node.js, cumpliendo con la restricción de no utilizar frameworks de terceros como Express. Instancié el servidor web, configuré el puerto de escucha dinámico (process.env.PORT ?? 4000) y programé una única línea de acción: toda petición que golpee mi puerto es delegada de inmediato al enrutador.

2. Bitácora de la Terminal: Comandos y Pruebas de Robustez
Para garantizar y certificar ante el profesor que mi código cumple con el 100% de los criterios de aceptación, realicé todo el ciclo de pruebas utilizando la terminal.

Paso 1: Inicialización del Servidor
Primero, abrí mi consola principal, navegué hasta el directorio raíz del proyecto y me moví específicamente a la carpeta del microservicio (la cual tiene una s al final en mi árbol de archivos). Posteriormente, encendí el proceso de Node.js:

PowerShell
# 1. Me ubico en la carpeta del microservicio de datos
cd db-services

# 2. Arranco el servidor web nativo
node index.js
Al ejecutarlo, mi pantalla congeló la terminal y arrojó el mensaje de escucha activo:

Plaintext
[db-service] Servidor de datos corriendo en el puerto :4000
Nota: Dejé esta terminal abierta de fondo para mantener el proceso vivo.

Paso 2: Abriendo una Segunda Terminal para las Pruebas CRUD
Abrí una nueva ventana de PowerShell para actuar como el "cliente" y empecé a disparar peticiones estructuradas con curl.exe para validar los flujos de éxito y de control de errores.

A. Listar los Datos Iniciales (Read)
Deseaba comprobar si mis 5 personas de prueba se habían cargado correctamente en memoria:

PowerShell
curl.exe http://localhost:4000/personas
Respuesta de mi servidor: Me devolvió un arreglo JSON impecable con los datos de Ana, Luis, Sofía, Carlos y María, acompañados de un código de estado 200 OK.

B. Crear una Nueva Persona (Create)
Inserté un registro completamente nuevo enviando los datos estructurados en formato JSON en el cuerpo de la petición:

PowerShell
curl.exe -X POST http://localhost:4000/personas -H "Content-Type: application/json" -d '{\"ci\":\"99999999\",\"nombre\":\"Test\",\"apellido\":\"Dev\"}'
Respuesta de mi servidor: El sistema procesó el cuerpo de la petición con éxito, guardó al usuario en el Map y me respondió con la estructura del usuario creado y un código de estado 201 Created.

C. Forzar el Control de Duplicados (Validación de Error 409)
Para probar la robustez, intenté registrar a una persona con una cédula idéntica a una que ya existía (en este caso, la cédula de Ana Rodríguez, 25111222), con el fin de verificar que mi sistema bloqueara la corrupción de datos:

PowerShell
curl.exe -X POST http://localhost:4000/personas -H "Content-Type: application/json" -d '{\"ci\":\"25111222\",\"nombre\":\"Clon\",\"apellido\":\"Falso\"}'
Respuesta de mi servidor: Mi validador en router.js detectó el conflicto usando db.exists() y me frenó en seco en la terminal devolviendo de forma excelente:

JSON
{"error":"La persona con CI 25111222 ya existe"}
Acompañado internamente de un código de estado HTTP 409 Conflict.

D. Modificar una Persona Existente (Update)
Actualicé el registro que creé previamente (99999999), alterando su nombre y apellido a través de la URL dinámica:

PowerShell
curl.exe -X PUT http://localhost:4000/personas/99999999 -H "Content-Type: application/json" -d '{\"nombre\":\"TestMod\",\"apellido\":\"DevMod\"}'
Respuesta de mi servidor: El Regex capturó el ID, modificó el elemento dentro del Map y me devolvió el JSON modificado con un código de estado 200 OK.

E. Forzar Modificación Inexistente (Validación de Error 404)
¿Qué pasa si intento modificar un número de cédula aleatorio que jamás ha sido registrado? Ejecuté la prueba enviando la cédula inventada 11111111:

PowerShell
curl.exe -X PUT http://localhost:4000/personas/11111111 -H "Content-Type: application/json" -d '{\"nombre\":\"Nadie\",\"apellido\":\"Gómez\"}'
Respuesta de mi servidor: El sistema buscó en el almacenamiento, determinó la ausencia del registro y me devolvió limpiamente en la terminal:

JSON
{"error":"Persona no encontrada"}
Acompañado de un código de estado HTTP 404 Not Found.

F. Eliminar una Persona (Delete)
Procedí a limpiar mi base de datos en memoria removiendo por completo la cédula de prueba:

PowerShell
curl.exe -X DELETE http://localhost:4000/personas/99999999
Respuesta de mi servidor: El registro fue removido del Map con éxito y obtuve un mensaje de confirmación con código 200 OK.