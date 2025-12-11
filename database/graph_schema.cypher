// DDL y Datos de Prueba para Neo4j
// Sintaxis Neo4j 5.x

// Limpiar datos existentes (Importante para re-ejecucion)
MATCH (n) DETACH DELETE n;

// Crear constraints
CREATE CONSTRAINT user_email_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.email IS UNIQUE;

CREATE CONSTRAINT pet_id_unique IF NOT EXISTS
FOR (p:Pet) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT service_id_unique IF NOT EXISTS
FOR (s:Service) REQUIRE s.id IS UNIQUE;

// Crear índices fulltext (SINTAXIS NEO4J 5.X)
CREATE FULLTEXT INDEX userSearch IF NOT EXISTS
FOR (u:User) ON EACH [u.name, u.email];

CREATE FULLTEXT INDEX petSearch IF NOT EXISTS
FOR (p:Pet) ON EACH [p.name, p.breed];

// Crear Nodos de ejemplo
CREATE (u1:User {
  id: 'user1',
  name: 'Ana García',
  email: 'ana@example.com',
  phone: '+54 351 123 4567',
  address: 'Av. San Martín 123, Villa Carlos Paz'
});

CREATE (u2:User {
  id: 'user2',
  name: 'Carlos López',
  email: 'carlos@example.com',
  phone: '+54 351 234 5678',
  address: 'Calle Belgrano 456, Villa Carlos Paz'
});

// Crear mascotas y relaciones
MATCH (u1:User {id: 'user1'})
CREATE (p1:Pet {
  id: 'pet1',
  name: 'Luna',
  species: 'perro',
  breed: 'Golden Retriever',
  age: 3,
  weight: 28.5
})
CREATE (u1)-[:OWNS]->(p1);

MATCH (u2:User {id: 'user2'})
CREATE (p2:Pet {
  id: 'pet2',
  name: 'Michi',
  species: 'gato',
  breed: 'Siamés',
  age: 2,
  weight: 4.2
})
CREATE (u2)-[:OWNS]->(p2);

// Crear servicio y relacion
MATCH (u2:User {id: 'user2'})
CREATE (s1:Service {
  id: 'service1',
  type: 'cuidado',
  price: 500.0,
  duration: 60,
  available: true
})
CREATE (u2)-[:OFFERS]->(s1);

// Verificar resultados
MATCH (n) RETURN labels(n)[0] as tipo, count(n) as cantidad;
