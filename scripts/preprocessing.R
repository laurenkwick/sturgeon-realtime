library(dplyr)
library(sf)
library(leaflet)

# Read in data
sturgeon <- read.csv("C:/Users/wicklk/Documents/GitHub/sturgeon-realtime/data/sturgeon_sep2025.csv")
hubs <- read.csv("C:/Users/wicklk/Documents/GitHub/sturgeon-realtime/data/receivers.csv")

# Filter by sturgeon points
sturgeon <- sturgeon %>%
  filter(Animal.Common.Name == "Atlantic sturgeon")

# Join to hub table
sturgeon <- inner_join(sturgeon, hubs, by = join_by(Hub==Hub))

# Add date column
sturgeon <- sturgeon %>%
  mutate(Date = lubridate::date(Date.and.Time..UTC.))

# Convert to sf object
sturgeon_sf <- sf::st_as_sf(sturgeon, coords = c("HubLongitude", "HubLatitude"))

# Summarize total pings in a week by receiver
receiver_sturgeon <- sturgeon_sf %>%
  group_by(Hub, geometry) %>%
  summarize(n())


# Set automatic leaflet basemap
m <- leaflet() %>%
  addProviderTiles(provider = "Esri.WorldGrayCanvas")

# Add points
m2 <- m %>%
  addMarkers(data=receiver_sturgeon)

m2



# Summarize by individual sturgeon
individual_sturgeon <- sturgeon_sf %>%
  group_by(ID) %>%
  summarize(n())

# Summarize by receiver
receiver_sturgeon <- sturgeon_sf %>%
  group_by(Hub, geometry) %>%
  summarize(n())

# Summarize by receiver and individual sturgeon 
individual_receiver_sturgeon <- sturgeon %>%
  group_by(ID, Hub) %>%
  summarize(n())

# Summarize by receiver, individual sturgeon, and date
individual_receiver_day <- sturgeon %>%
  group_by(ID, Hub, Date) %>%
  summarize(n())

# Total count of unique fish at each receiver
fish_per_receiver <- individual_receiver_sturgeon %>%
  group_by(Hub) %>%
  summarize(n())

# Count of unique fish ID per day at each receiver
fish_per_day_per_receiver <- individual_day_receiver %>%
  group_by(Hub, Date) %>%
  summarize(n())

# One ping per individual per day per receiver
individual_day_receiver <- individual_receiver_day %>%
  group_by(ID, Date, Hub) %>%
  arrange(ID, Date)

