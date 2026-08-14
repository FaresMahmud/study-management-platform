-- Corrige a restrição da coluna obsoleta 'objective_hours' para permitir nulos, 
-- evitando erros de restrição no MySQL visto que a entidade JPA correspondente não a mapeia mais.
ALTER TABLE goals MODIFY COLUMN objective_hours DOUBLE PRECISION NULL;
