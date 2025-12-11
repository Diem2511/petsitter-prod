Write-Host "Inicializando Neo4j..." -ForegroundColor Cyan

$cypherPath = "C:\PetSitterVecinal\backend\database\graph_schema.cypher"

# Corregir encoding del archivo
$content = Get-Content $cypherPath -Raw
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($cypherPath, $content, $utf8NoBom)

# Copiar al contenedor
docker cp $cypherPath petsitter-neo4j:/var/lib/neo4j/import/graph_schema.cypher

# Ejecutar
docker exec petsitter-neo4j cypher-shell -a bolt://localhost:7687 -u neo4j -p petsitter123 -d neo4j -f /var/lib/neo4j/import/graph_schema.cypher

Write-Host "Listo!" -ForegroundColor Green