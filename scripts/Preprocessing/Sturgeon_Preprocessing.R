library(dplyr)
library(sf)
library(lubridate)
library(tidyr)

#################
### READ DATA ###
#################

sturgeon <- read.csv("~/GitHub/sturgeon-realtime/data/Sturgeon_Raw_Input.csv")
hubs <- read.csv("~/GitHub/sturgeon-realtime/data/Hub_Locations.csv")

# Filter by sturgeon points
sturgeon <- sturgeon %>%
  filter(Animal.Common.Name == "Atlantic sturgeon")

####################################
### CREATE STURGEON MOVEMENT CSV ###
####################################

# Set time window interval
interval <- "4 hours"

sturgeon_summary <- sturgeon %>%
  mutate(
    Date.Time = lubridate::as_datetime(Date.and.Time..UTC.),
    Date.Time.Rounded = floor_date(Date.Time, interval)
  ) %>%
  # Group by fish ID and time bucket to evaluate multi-hub visits
  group_by(ID, Date.Time.Rounded) %>%
  # Identify the chronological arrival order for each distinct hub in the same window
  mutate(
    first_seen = min(Date.Time),
    distinct_hubs = n_distinct(Hub)
  ) %>%
  group_by(ID, Date.Time.Rounded, Hub) %>%
  summarize(
    arrival_time = min(Date.Time),
    ping_count = n(),
    distinct_hubs = first(distinct_hubs),
    .groups = "drop"
  ) %>%
  # Assign tiebreaker - NA if only 1 Hub was visited, otherwise 1, 2, 3... in arrival order
  group_by(ID, Date.Time.Rounded) %>%
  arrange(arrival_time, .by_group = TRUE) %>%
  mutate(
    tiebreaker = if_else(distinct_hubs > 1, row_number(), NA_integer_)
  ) %>%
  ungroup()

# Extract date range from the dataset
start_date <- min(sturgeon_summary$Date.Time.Rounded)
end_date <- max(sturgeon_summary$Date.Time.Rounded)

### Build full sequence of 4-hour buckets
all_buckets <- tibble(
  Date.Time.Rounded = seq(start_date, end_date, by = interval)
)

sturgeon_movement <- sturgeon_summary %>%
  # Create a complete grid for all fish across all time buckets
  complete(ID, Date.Time.Rounded = all_buckets$Date.Time.Rounded) %>%
  group_by(ID) %>%
  arrange(Date.Time.Rounded, tiebreaker, .by_group = TRUE) %>%
  # Carry forward the last known hub, then backfill for initial leading NA intervals
  fill(Hub, .direction = "down") %>%
  fill(Hub, .direction = "up") %>%
  ungroup() %>%
  rename(
    Sturgeon_ID = ID,
    Date_Time_Rounded = Date.Time.Rounded,
    Hub_ID = Hub,
    Arrival_Time = arrival_time,
    Distinct_Hubs = distinct_hubs,
    Tie_Breaker = tiebreaker
  ) %>%
  select(Sturgeon_ID, Date_Time_Rounded, Hub_ID, Arrival_Time, Distinct_Hubs, Tie_Breaker)

##############################
### CREATE HUB SUMMARY CSV ###
##############################

hub_summary <- sturgeon %>%
  group_by(Hub) %>%
  summarize(Sturgeon_Count = n_distinct(ID))

hub_summary <- inner_join(hub_summary, hubs, by = join_by(Hub))

hub_summary <- hub_summary %>%
  rename(
    Hub_ID = Hub,
    Hub_Latitude = HubLatitude,
    Hub_Longitude = HubLongitude
  )

###################################
### CREATE STURGEON DETAILS CSV ###
###################################

sturgeon_details <- sturgeon %>%
  group_by(ID) %>%
  summarize(
    Sturgeon_Name = first(Animal.Friendly.Name),
    Fork_Length = first(Animal.Length..m.),
    Fork_Length_2 = first(Animal.Length2..m.),
    Sex = first(Animal.Sex),
    Date_Tagged = first(Release.Date.and.Time..UTC.)
  ) %>%
  rename(
    Sturgeon_ID = ID
  )

##########################
### WRITE OUTPUT FILES ###
##########################

write.csv(sturgeon_movement, "~/GitHub/sturgeon-realtime/data/Sturgeon_Movement.csv")
write.csv(hub_summary, "~/GitHub/sturgeon-realtime/data/Hub_Summary.csv")
write.csv(sturgeon_details, "~/GitHub/sturgeon-realtime/data/Sturgeon_Details.csv")
