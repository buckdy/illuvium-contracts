import i18next from 'i18next';

i18next
  .init({
    interpolation: {
      escapeValue: false,
    },
    lng: 'en', // 'en' | 'es'
    // Using simple hardcoded resources for simple example
    resources: {
      en: {
        translation: {
          header: {
            tab1: "WHO",
            tab2: "WHAT",
            tab3: "HOW",
            tab4: "DO"
          },
          "title": {
            "section2": "What we do",
            "section3": "How we do it",
            "section4": "Let's do it",
            "section5": "Get in touch"
          },
          "content": {
            "section1": "We are a full stack developers and data scientists that build technological solutions to optimize the processes of your company.",
            "section2": {
              "primary": "We build technological solutions to optimize the processes of your company",
              "subTitle1": "Customized Machine learning",
              "subContent1": "We use your company's data to develop a customized predictive model to the Key Performance Indicator (KPI) that you want to optimize",
              "subTitle2": "Customized Software Development",
              "subContent2": "We use the knowledge of your company's processes to develop a software solution customized to your need in order to optimize those processes"
            },
            "section3": {
              "subContent1": "We work with you to analyze the problem you want to solve",
              "subContent2": "Using that knowledge we define with you a Specific, Measurable, Achievable, Relevant and Time-bound (SMART) objective",
              "subContent3": "With this SMART objective as a guide, we develop in an AGILE way a STS (smart technological solution) that solves your problem"
            },
            "section4": {
              "primary": "Some use cases of what we can do with you",
              "subSection1": {
                "primary": "FINANCE",
                "content": {
                  "primaryTitle": "PRICING",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "ML model that consider the key variables that affect prices, and uses them to define an automated strategy with dynamic pricing in real time",
                  "subTitle2": "Software Development (SD)",
                  "subContent2": "Software solution to dynamically manage the use of a services by a customer based on the terms of his/her contract. This is solution can incorporate the ML model to change the price strategy associated to the service according to its use"
                }
              },
              "subSection2": {
                "primary": "MINING",
                "content": {
                  "primaryTitle": "MACHINERY",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "ML model to forecast a machine failure before it occurs",
                  "subTitle2": "Software Development (SD)",
                  "subContent2": "Software solution to manage the machinery's life cyde. This solution can incorporate the ML model to generate malfunction alerts before the machine really starts to fail"
                }
              },
              "subSection3": {
                "primary": "LOGISTICS",
                "content": {
                  "primaryTitle": "CONTAINERS",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Deep Learning (DL) model to detect automatically containers damage from images",
                  "subTitle2": "Software Development (SD)",
                  "subContent2": "Software solution to manage the container's life cycle. This soltion can incorporate the DL model to generate damage alerts when they are detected from the container's images coming from surveillance / UAV video"
                }
              },
              "subSection4": {
                "primary": "CATTLE RAISING",
                "content": {
                  "primaryTitle": "LIVESTOCK",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Deep Learning (DL) model to automatically identify livestock from images.",
                  "subTitle2": "Software Development (SD)",
                  "subContent2": "Software solution to manage the livestock’s movements. This solution can incorporate the DL model to automatically identify and track the livestock from the livestock’s images coming from surveillance/UAV video."
                }
              },
              "subSection5": {
                "primary": "RETAIL",
                "content": {
                  "primaryTitle": "SALES",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Recommender System (RS) to offer additional services or products by automatically linking services and products with potential customers based on the customer buying behavior and profile.",
                  "subTitle2": "Software Development (SD)",
                  "subContent2": "Software solution to track the salespersons' performance and determination of the commission to be paid to each of them based on their performance. This solution can incorporate the RS to help improve the performance of the salespersons."
                }
              },
              "subSection6": {
                "primary": "MARKETING",
                "content": {
                  "primaryTitle": "CUSTOMERS",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "ML model that using information from social sites is able to score the customer engagement with the company’s brand.",
                  "subTitle2": "Software Development (SD)",
                  "subContent2": "Software solution to scrape the social sites to retrieve all the information related with the customer engagement’s key drivers. This solution can incorporate the ML model to automatically build a customer’s engagement score."
                }
              }
            },
            "section5": {
              "title": "GET IN TOUCH",
              "content": "If you want to optimize your company, please get in touch through:",
              "yourName": "Your Name",
              "yourEmail": "Your Email",
              "yourMessage": "Your Messages",
              "btnText": "Send Message"
            }
          }
        }
      },
      es: {
        translation: {
          header: {
            tab1: "QUIEN",
            tab2: "QUE",
            tab3: "COMO",
            tab4: "HACER"
          },
          "title": {
            "section2": "¿Qué hacemos?",
            "section3": "¿Cómo lo hacemos?",
            "section4": "Hagámoslo",
            "section5": "Contáctanos"
          },
          "content": {
            "section1": "Somos desarrolladores y científicos de datos completos que desarrollan soluciones tecnológicas para optimizar los procesos de su empresa.",
            "section2": {
              "primary": "Desarrollamos e implementamos soluciones tecnológicas para optimizar los procesos de tu empresa.",
              "subTitle1": "Machine Learning adaptada a tus necesidades",
              "subContent1": "Utilizamos los datos de tu empresa para desarrollar un modelo de Machine Learning personalizado al Indicador Clave de Rendimiento (KPI) que necesites optimizar.",
              "subTitle2": "Desarrollo de software a medida",
              "subContent2": "Utilizamos el conocimiento adquirido de los procesos de tu empresa, para desarrollar una solución de software adaptada a tus necesidades, con el fin de optimizar esos procesos."
            },
            "section3": {
              "subContent1": "Trabajamos en conjunto para analizar el problema que buscas resolver.",
              "subContent2": "Usando ese conocimiento, definimos en conjunto un objetivo Específico, Medible, Alcanzable, Relevante y de Duración determinada (SMART).",
              "subContent3": "Con este objetivo (SMART) como guía, desarrollamos de forma ÁGIL una solución tecnológica inteligente (STI) que resolverá tu problema."
            },
            "section4": {
              "primary": "Alguno de los casos que podríamos implementar en tu empresa",
              "subSection1": {
                "primary": "FINANZAS",
                "content": {
                  "primaryTitle": "PRECIOS",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Modelo de ML que considere las principales variables que afectan la fijación de precios y, en función de éstas defina una estrategia automatizada, con precios dinámicos en tiempo real.",
                  "subTitle2": "Desarrollo de Software (DS)",
                  "subContent2": "Solución de software que administre en forma dinámica el uso de un servicio por parte de un cliente, según los términos de su contrato. Esta solución puede incorporar el modelo de ML a fin de adaptar la estrategia de precios sugerida y de acuerdo al servicio a ser utilizado por cada cliente."
                }
              },
              "subSection2": {
                "primary": "MINERÍA",
                "content": {
                  "primaryTitle": "MAQUINARIA",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Modelo ML que pronostique fallas en la maquinaria antes de que éstas ocurran.",
                  "subTitle2": "Desarrollo de Software (DS)",
                  "subContent2": "Solución de software que gestione el ciclo de vida de la maquinaria. Esta solución puede incorporar el modelo ML para generar alertas de mal funcionamiento antes de que la maquinaria realmente comience a fallar."
                }
              },
              "subSection3": {
                "primary": "LOGISTICA",
                "content": {
                  "primaryTitle": "CONTENEDORES",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Aplicación de Deep Learning (DL) que detecte automáticamente daños en los contenedores a través de imágenes captadas de los mismos.",
                  "subTitle2": "Desarrollo de Software (DS)",
                  "subContent2": "Solución de software que gestione el ciclo de vida del contenedor. Esta solución puede incorporar el modelo DL a fin de generar alertas de daños, cuando sean detectadas en las imágenes de los contenedores provenientes de videos de distintas fuentes (UAV, vigilancia, etc.)."
                }
              },
              "subSection4": {
                "primary": "GANADERÍA",
                "content": {
                  "primaryTitle": "GANADO",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Aplicación de Deep Learning (DL) que identifique automáticamente el ganado a partir de imágenes.",
                  "subTitle2": "Desarrollo de Software (DS)",
                  "subContent2": "Solución de software que gestione los movimientos del ganado. Esta solución puede incorporar el modelo DL a fin de identificar y rastrear automáticamente el ganado, usando las imágenes de éstos provenientes de video de distintas fuentes (UAV, vigilancia, etc.)."
                }
              },
              "subSection5": {
                "primary": "COMERCIO",
                "content": {
                  "primaryTitle": "VENTAS",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Sistema Recomendador (RS) de servicios o productos mediante la vinculación automática de servicios o productos con clientes potenciales, basándose en el comportamiento de compra y el perfil de los clientes.",
                  "subTitle2": "Desarrollo de Software (DS)",
                  "subContent2": "Solución de software que gestione el desempeño y determine la comisión a pagar para cada miembro del equipo de ventas, en función de su desempeño. Esta solución puede incorporar el RS a fin de mejorar el desempeño de los vendedores."
                }
              },
              "subSection6": {
                "primary": "MARKETING",
                "content": {
                  "primaryTitle": "CLIENTES",
                  "subTitle1": "Machine Learning (ML)",
                  "subContent1": "Modelo ML que a través del uso de la información de los sitios web y redes sociales sea capaz de calificar el nivel de compromiso del cliente con la marca de la empresa.",
                  "subTitle2": "Desarrollo de Software (DS)",
                  "subContent2": "Solución de software que rastree las redes sociales a fin de recuperar toda la información relacionada con los impulsores clave del compromiso del cliente con la marca de la empresa. Esta solución puede incorporar el modelo ML a fin de calificar automáticamente el nivel de compromiso del cliente."
                }
              }
            },
            "section5": {
              "title": "Contáctanos",
              "content": "Si quieres optimizar tu empresa, por favor, pónte en contacto usando:",
              "yourName": "Tu nombre",
              "yourEmail": "Tu correo",
              "yourMessage": "Tu mensaje",
              "btnText": "Enviar mensaje"
            }
          }
        }
      },
    },
  })

export default i18next