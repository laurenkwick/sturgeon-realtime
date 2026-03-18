library(shiny)
library(leaflet)
library(htmlwidgets)

ui <- fluidPage(
  titlePanel("Leaflet + D3 Integration"),
  leafletOutput("map", height = "600px"),
  tags$head(tags$script(src = "https://d3js.org/d3.v7.min.js"))
)

server <- function(input, output, session) {
  output$map <- renderLeaflet({
    leaflet() %>%
      addTiles() %>%
      setView(lng = -77,1, lat = 37.3, zoom = 9) %>%
      # Use onRender to execute D3 code after the map is initialized
      onRender(
        readLines("C:/Users/wicklk/Documents/GitHub/sturgeon-realtime/scripts/d3_shiny_test.js", warn=FALSE),
        data = sturgeon_map
      )
  })
}

shinyApp(ui, server)

