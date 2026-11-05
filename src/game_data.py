# -*- coding: utf-8 -*-
"""Datos del juego FLUJO LIBRE - juego original de educacion financiera."""

JUEGO = "FLUJO LIBRE"
LEMA = "El juego de la libertad financiera"

# ---------------------------------------------------------------- PROFESIONES
# (nombre, emoji, salario neto/mes, gastos/mes, efectivo inicial, nota)
PROFESIONES = [
    ("Maestro/a", "A", 26000, 19000, 30000,
     "Ingreso bajo, gastos bajos. El que menos necesita para ser libre."),
    ("Enfermero/a", "B", 38000, 27000, 45000,
     "Turnos largos, ingreso estable. Ojo con el cansancio y las deudas."),
    ("Contador/a", "C", 46000, 33000, 60000,
     "Conoce los números: úsalo a tu favor."),
    ("Diseñador/a gráfico", "D", 34000, 26000, 35000,
     "Ingreso variable por proyectos. Meses buenos y meses flacos."),
    ("Vendedor/a", "E", 40000, 31000, 40000,
     "Comisiones altas, ingresos irregulares. Fondo de emergencia YA."),
    ("Chef", "F", 33000, 25000, 30000,
     "Negocio propio en la mira. Cocina rico, cobra mejor."),
    ("Policía", "G", 36000, 24000, 50000,
     "Pensión y estabilidad. La trampa: sentirse seguro y no invertir."),
    ("Ingeniero/a de software", "H", 72000, 48000, 110000,
     "Buen sueldo, gastos altos. La diferencia se llama estilo de vida."),
    ("Abogado/a", "I", 80000, 58000, 120000,
     "Ingreso alto, deuda de oficina. Cuidado con el 'ya lo merezco'."),
    ("Médico/a", "J", 95000, 70000, 150000,
     "El ingreso más alto y la salida más cara. No confundas sueldo con riqueza."),
    ("Piloto/a", "K", 78000, 60000, 130000,
     "Vives viajando: casa grande, auto grande, flujo pequeño."),
    ("Dueño/a de negocio", "L", 60000, 45000, 90000,
     "Tu negocio depende de ti. Construye sistemas o nunca descansas."),
]

# ------------------------------------------------------- OPORTUNIDADES PEQUENAS
# (nombre, etiqueta, costo total, pago inicial, flujo/mes, nota)
PEQUENAS = [
    ("Fondo índice global", "BOLSA", 30000, 30000, 150,
     "Diversificación automática. Aburrido y efectivo."),
    ("Acciones de banco regional", "BOLSA", 45000, 45000, 260,
     "Dividendo trimestral. Revisa que el banco sea sólido."),
    ("Acciones de tecnológica", "BOLSA", 60000, 60000, 150,
     "Poco dividendo, mucha expectativa. Se vende en el Mercado."),
    ("Bono corporativo", "RENTA FIJA", 50000, 50000, 300,
     "Renta conocida. El riesgo es que la empresa pague."),
    ("CDT a 12 meses", "RENTA FIJA", 40000, 40000, 230,
     "Casi sin riesgo, casi sin emoción."),
    ("Fondo de dividendos", "BOLSA", 55000, 55000, 380,
     "Cuatro empresas que reparten cada mes."),
    ("Acciones de energética", "BOLSA", 38000, 38000, 260,
     "Regulada y estable. El precio se mueve lento."),
    ("Crowdfunding inmobiliario", "COLECTIVO", 25000, 25000, 190,
     "Muchos pequeños prestamistas, un solo edificio."),
    ("Máquina expendedora", "NEGOCIO", 18000, 18000, 320,
     "La compras, la surtes, ella trabaja de noche."),
    ("Carrito de café", "NEGOCIO", 22000, 15000, 350,
     "Te prestan el 30%. El café se acaba, la deuda no."),
    ("Alquiler de bicicletas", "NEGOCIO", 30000, 20000, 400,
     "Temporada alta en verano. Guarda para el invierno."),
    ("Marca de diseño freelance", "SERVICIO", 12000, 12000, 260,
     "Vendes tu tiempo. Escala solo si contratas ayuda."),
    ("Venta por catálogo", "NEGOCIO", 15000, 10000, 240,
     "Comisión por cada venta. Tu red es el activo."),
    ("Fotografía de eventos", "SERVICIO", 20000, 14000, 380,
     "Equipo propio. Fines de semana ocupados."),
    ("Curso online grabado", "DIGITAL", 10000, 10000, 180,
     "Lo grabas una vez, se vende mil veces."),
    ("Huerto hidropónico", "NEGOCIO", 28000, 18000, 360,
     "Lechugas frescas a domicilio. Agua y luz controladas."),
    ("Fondo de bonos emergentes", "RENTA FIJA", 35000, 35000, 290,
     "Más rendimiento, más riesgo país."),
    ("Acciones de retail", "BOLSA", 42000, 42000, 300,
     "Depende del consumo. En crisis, sufre."),
    ("Fondo de oro", "PROTECCIÓN", 48000, 48000, 0,
     "No produce flujo: produce calma. Se vende en el Mercado."),
    ("ETF de cripto regulada", "VOLÁTIL", 30000, 30000, 0,
     "Sin flujo, con mucha montaña rusa. Solo dinero que puedas perder."),
    ("Royalties de una canción", "REGALÍAS", 26000, 26000, 320,
     "Cada reproducción paga. Para siempre, mientras suene."),
    ("Participación en app de presupuesto", "DIGITAL", 32000, 24000, 420,
     "5% del negocio. Revisa cuántos usuarios pagan."),
    ("Lavandería (sociedad)", "NEGOCIO", 45000, 25000, 780,
     "Socio operador, tú pones el capital."),
    ("Food truck (sociedad)", "NEGOCIO", 55000, 30000, 950,
     "Rueda, vende y no se queda quieto."),
    ("Vending en oficinas", "NEGOCIO", 34000, 20000, 620,
     "Tres máquinas en un edificio lleno de gente con hambre."),
    ("Marca de clases particulares", "SERVICIO", 8000, 8000, 180,
     "Empiezas tú, luego contratas profesores."),
    ("Fondo de infraestructura", "RENTA FIJA", 52000, 52000, 340,
     "Peajes y aeropuertos. Flujo lento y seguro."),
    ("Préstamo a un familiar (10%)", "RIESGO", 20000, 20000, 250,
     "Papel firmado y plan de pago. Sin eso, es un regalo."),
    ("Equipo para alquilar", "NEGOCIO", 24000, 16000, 420,
     "Andamios, sonido, sillas: alguien siempre lo necesita."),
    ("Cuota de franquicia de limpieza", "FRANQUICIA", 40000, 28000, 760,
     "Marca conocida, regalías incluidas."),
    ("Oferta de un amigo: triplica tu dinero en 3 meses", "DUDOSA", 20000, 20000, 0,
     "Sin contrato, sin garantía, sin flujo. ¿Le prestas?"),
    ("Curso para invertir sin dinero", "DUDOSA", 5000, 5000, 0,
     "Cuesta poco y enseña menos. Pero algo aprendes."),
]

# --------------------------------------------------------- OPORTUNIDADES GRANDES
GRANDES = [
    ("Apartamento 2 habitaciones", "VIVIENDA", 150000, 30000, 3200,
     "Zona con transporte. Inquilino estable desde el primer mes."),
    ("Casa 3 habitaciones en suburbios", "VIVIENDA", 240000, 48000, 4800,
     "Familia con hijos, contrato a 2 años."),
    ("Local comercial en esquina", "COMERCIAL", 280000, 84000, 8500,
     "Arrendatario con 10 años en el sector."),
    ("Dúplex (dos rentas)", "VIVIENDA", 210000, 42000, 5600,
     "Dos puertas, dos inquilinos, dos depósitos."),
    ("Terreno urbano sin construir", "TERRENO", 100000, 20000, 0,
     "No genera flujo hoy. Genera plusvalía mañana."),
    ("Cuatro estacionamientos", "COMERCIAL", 75000, 15000, 2400,
     "Casi sin mantenimiento. Casi sin emoción."),
    ("Bodega pequeña", "INDUSTRIAL", 175000, 35000, 4100,
     "Contrato con una empresa de logística."),
    ("Edificio de 6 apartamentos", "VIVIENDA", 600000, 120000, 15000,
     "Seis rentas, un solo techo que reparar."),
    ("Casa de playa (renta corta)", "TURISMO", 330000, 66000, 6900,
     "Temporada alta excelente. Temporada baja, silencio."),
    ("Oficina de 80 m2", "COMERCIAL", 235000, 70000, 6800,
     "Consultoría joven que acaba de firmar 3 años."),
    ("Lavandería automática", "NEGOCIO", 130000, 52000, 7400,
     "Empleado medio tiempo incluido en los números."),
    ("Cafetería de barrio", "NEGOCIO", 100000, 40000, 6200,
     "Clientela fiel. El café no se inventa, se ejecuta."),
    ("Franquicia de comida", "FRANQUICIA", 300000, 120000, 14000,
     "Te dan el manual. Te cobran regalías."),
    ("Taller mecánico", "NEGOCIO", 150000, 60000, 8100,
     "Equipo y clientes incluidos. El jefe anterior se jubila."),
    ("Finca de cultivo", "AGRO", 200000, 80000, 9000,
     "Buena cosecha, buen año. El clima no firma contratos."),
    ("Mini-supermercado", "NEGOCIO", 250000, 100000, 12500,
     "Márgenes delgados, volumen enorme."),
    ("Gimnasio boutique", "NEGOCIO", 170000, 68000, 9400,
     "Mensualidades fijas. La moda del fitness ayuda."),
    ("Guardería", "NEGOCIO", 140000, 56000, 7600,
     "Lista de espera de 40 familias."),
    ("Apartamento para renta corta", "TURISMO", 135000, 27000, 2900,
     "Centro histórico. Buen flujo, mucho trabajo."),
    ("Paneles solares (venta a la red)", "ENERGÍA", 90000, 27000, 2100,
     "Contrato de 15 años con la distribuidora."),
    ("Patio de camiones", "INDUSTRIAL", 190000, 57000, 5800,
     "Transportadora con contrato renovable."),
    ("Hotel pequeño de 10 habitaciones", "TURISMO", 800000, 200000, 28000,
     "Necesita gerente. Tú no eres el gerente."),
    ("50% de una marca de ropa", "SOCIEDAD", 120000, 60000, 7000,
     "Tu socio diseña, tú pones el capital."),
    ("Participación en app SaaS", "DIGITAL", 95000, 48000, 6500,
     "Ingresos recurrentes. También gastos recurrentes."),
    ("Salón de belleza", "NEGOCIO", 80000, 32000, 5200,
     "Seis sillas, seis estilistas independientes."),
    ("Panadería de barrio", "NEGOCIO", 105000, 42000, 6400,
     "Se levanta a las 4 a.m. Tú no: el panadero."),
    ("Almacén de self-storage", "INDUSTRIAL", 230000, 69000, 9700,
     "Cincuenta puertas que se alquilan solas."),
    ("Socio vende su parte de un bar", "NEGOCIO", 70000, 70000, 1800,
     "Precio de oportunidad. Revisa por qué se va."),
    ("Terreno en zona de expansión", "TERRENO", 110000, 22000, 0,
     "Sin flujo hoy. La ciudad viene hacia acá."),
]

# --------------------------------------------------------------------- MERCADO
MERCADO = [
    ("BOOM INMOBILIARIO", "Vende UNA propiedad por 2 veces su costo. Cobra en efectivo."),
    ("DEMANDA DE ALQUILER", "Sube 25% el flujo de UNA propiedad (permanente). Anótalo en tu hoja."),
    ("MERCADO DE ACCIONES AL ALZA", "Vende cualquier acción o fondo por 1,5 veces su costo."),
    ("CORRECCIÓN DE MERCADO", "Tus acciones y fondos valen 30% menos. Puedes vender perdiendo o mantener."),
    ("COMPRADOR PARA TU NEGOCIO", "Vende un negocio por 1,5 veces su costo."),
    ("DIVIDENDO EXTRAORDINARIO", "Cobra 3 meses de flujo de todos tus activos, de una sola vez."),
    ("RECESIÓN", "Pierdes el próximo turno y pagas 5.000 de gastos extras."),
    ("OFERTA POR TUS TERRENOS", "Vende un terreno por 1,8 veces su costo."),
    ("OPA SOBRE TU CARTERA", "Un fondo ofrece 1,3 veces el costo de todas tus acciones. Aceptas o pasas."),
    ("INFLACIÓN", "Tus gastos mensuales suben 10% (redondea a la centena). Anótalo."),
    ("AUGE DE ARRENDAMIENTOS", "Sube 20% el flujo de UNA propiedad (permanente)."),
    ("REEMBOLSO DEL BANCO", "Te devuelven 8.000 de comisiones. Cobra y sigue."),
    ("ACCESO ANTICIPADO", "Roba una carta de Oportunidad Grande AHORA y decide si la compras."),
    ("LIQUIDACIÓN TOTAL", "Vende cualquier activo por 2 veces su costo. Solo esta carta."),
    ("CRÉDITO CONGELADO", "Este turno no puedes pedir préstamos al banco. Ni tú ni nadie."),
    ("INQUILINO SE VA", "Una propiedad tuya no genera flujo durante 2 turnos."),
    ("OFERTA ENTRE JUGADORES", "Elige un activo de otro jugador y ofrécele 1,5 veces su costo. Puede aceptar o rechazar."),
    ("CONSULTORÍA PAGADA", "Cobras 10.000 por una asesoría. Bien por ti."),
    ("TU CASA SUBE DE VALOR", "Puedes vender tu vivienda principal por 1,5 veces su costo y volver a alquilar."),
    ("CRISIS DE CONFIANZA", "Todos los jugadores pagan 3.000 de gastos imprevistos. Tú también."),
]

# ---------------------------------------------------------------------- GUSTOS
GUSTOS = [
    ("Celular nuevo de gama alta", 12000, "El que tienes funciona. Este también brilla."),
    ("Fin de semana en la playa", 8000, "Sol, hotel y comida. Vuelves el lunes igual de cansado."),
    ("Cena en restaurante caro", 4000, "La cuenta llega antes que la felicidad."),
    ("Suscripciones que olvidaste", 3000, "Cuatro cobros de 750. Ninguno lo usaste este mes."),
    ("Ropa que usarás una vez", 5000, "Etiqueta puesta, armario lleno."),
    ("Café diario del mes", 2500, "30 cafés de 83. Los números no mienten."),
    ("Televisor de 75 pulgadas a 24 cuotas", 15000, "Pago inicial. Suma 1.500 a tus gastos fijos."),
    ("Auto nuevo 'porque te lo mereces'", 25000, "Pago inicial. Suma 2.500 a tus gastos fijos (seguro, cuota, parqueadero)."),
    ("Multa de tránsito", 6000, "Ibas con prisa. Ahora vas a pie."),
    ("Regalo de cumpleaños", 5000, "Tu sobrina cumple 15. No hay opción."),
    ("Reparación del techo", 9000, "Gotera en el cuarto. La casa no negocia."),
    ("Mudanza", 11000, "Cambias de barrio, no de hábitos."),
    ("REVISAS TUS GASTOS", -2000, "Cancelas dos suscripciones. Tus gastos fijos bajan 2.000 para siempre."),
    ("VENDES LO QUE NO USAS", -4000, "Cobras 4.000 en efectivo. Menos cosas, más dinero."),
]

# --------------------------------------------------------------------- SUEÑOS
SUENOS = [
    ("Casa en la montaña", 120000),
    ("Un año viajando por el mundo", 80000),
    ("Fundación educativa", 150000),
    ("Velero para navegar el Caribe", 110000),
    ("Isla privada (99 años de renta)", 250000),
    ("Colección de arte", 90000),
    ("Auto clásico restaurado", 60000),
    ("Año sabático sin trabajar", 75000),
    ("Escuela gratuita para tu barrio", 160000),
    ("Estadio con tu nombre", 250000),
    ("Rancho con caballos", 200000),
    ("Empresa que emplee a 50 personas", 180000),
]

# -------------------------------------------------------------------- TABLERO
TABLERO = [
    ("SALIDA", "cobrar", "Cobra tu flujo de caja"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
    ("Mercado", "mercado", "Roba 1 carta"),
    ("Gusto", "gusto", "Gasta o ahorra"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
    ("COBRA", "cobrar", "Cobra tu flujo de caja"),
    ("Oportunidad grande", "grande", "Roba 1 carta"),
    ("COBRA", "cobrar", "Cobra tu flujo de caja"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
    ("Mercado", "mercado", "Roba 1 carta"),
    ("Oportunidad grande", "grande", "Roba 1 carta"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
    ("COBRA", "cobrar", "Cobra tu flujo de caja"),
    ("Gusto", "gusto", "Gasta o ahorra"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
    ("Mercado", "mercado", "Roba 1 carta"),
    ("Oportunidad grande", "grande", "Roba 1 carta"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
    ("COBRA", "cobrar", "Cobra tu flujo de caja"),
    ("COBRA", "cobrar", "Cobra tu flujo de caja"),
    ("Oportunidad grande", "grande", "Roba 1 carta"),
    ("Mercado", "mercado", "Roba 1 carta"),
    ("Banco / Caridad", "banco", "Préstamo o donación"),
    ("Oportunidad pequeña", "peq", "Roba 1 carta"),
]

VIA = [
    ("COBRA", "cobrar", "Cobra tu flujo x10"),
    ("Oportunidad", "peq", "Roba 1 carta"),
    ("SUEÑO", "sueno", "Compra tu sueño"),
    ("Mercado", "mercado", "Roba 1 carta"),
    ("COBRA", "cobrar", "Cobra tu flujo x10"),
    ("Oportunidad", "peq", "Roba 1 carta"),
    ("SUEÑO", "sueno", "Compra tu sueño"),
    ("AUDITORÍA", "banco", "Paga 10% de tu efectivo"),
    ("COBRA", "cobrar", "Cobra tu flujo x10"),
    ("Oportunidad", "peq", "Roba 1 carta"),
    ("SUEÑO", "sueno", "Compra tu sueño"),
    ("Mercado", "mercado", "Roba 1 carta"),
]

# Posiciones en la rejilla 8x6 (columna, fila) con origen arriba a la izquierda.
# Recorrido horario desde la esquina inferior izquierda.
RATONERA_POS = [
    (1, 6), (2, 6), (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6),   # 0-7  fila inferior
    (8, 5), (8, 4), (8, 3), (8, 2),                                    # 8-11 columna derecha
    (8, 1), (7, 1), (6, 1), (5, 1), (4, 1), (3, 1), (2, 1), (1, 1),    # 12-19 fila superior
    (1, 2), (1, 3), (1, 4), (1, 5),                                    # 20-23 columna izquierda
]

# Vía Rápida: serpiente de 12 casillas (fila 2 hacia la derecha, fila 3 hacia la izquierda)
VIA_POS = [(c, 2) for c in range(2, 8)] + [(c, 3) for c in range(7, 1, -1)]

# ---------------------------------------------------------------- balance
# Multiplicadores de flujo para que una partida dure 10-15 rondas por jugador.
# (Los montos se redondean para que las cartas queden limpias.)
BIG_MULT = 2.0
SMALL_MULT = 1.5

PEQUENAS = [(n, t, c, i, int(round(f * SMALL_MULT / 10.0)) * 10, note)
            for n, t, c, i, f, note in PEQUENAS]
GRANDES = [(n, t, c, i, int(round(f * BIG_MULT / 100.0)) * 100, note)
           for n, t, c, i, f, note in GRANDES]


