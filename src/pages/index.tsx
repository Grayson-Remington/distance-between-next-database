import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { SignIn, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { RiPinDistanceFill } from "react-icons/ri";
import { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  DirectionsRenderer,
  InfoWindowF,
} from "@react-google-maps/api/";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { getDistance, getCenter } from "geolib";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import parse from "autosuggest-highlight/parse";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { decode } from "@googlemaps/polyline-codec";
import { Decimal } from "@prisma/client/runtime";

interface PlacesAutocompleteProps {
  saved_locations: Saved_Location[] | null;
  setSelected: React.Dispatch<
    React.SetStateAction<{
      description: string;
      main_text: string;
      secondary_text: string;
      lat: number;
      lng: number;
    } | null>
  >;
}

interface Saved_Location {
  id: string;
  createdAt: Date;
  userId: string;
  name: string;
  description: string;
  main_text: string;
  secondary_text: string;
  lat: Decimal;
  lng: Decimal;
}

interface MainTextMatchedSubstrings {
  offset: number;
  length: number;
}
interface StructuredFormatting {
  main_text: string;
  secondary_text: string;
  main_text_matched_substrings?: readonly MainTextMatchedSubstrings[];
}
interface PlaceType {
  description: string;
  structured_formatting: StructuredFormatting;
}

const Saved_LocationView = (props: Saved_Location) => {
  const { mutate: deletefriend } = api.saved_locations.delete.useMutation();

  return (
    <div
      key={props.id}
      className="flex w-full items-center justify-center gap-4"
    >
      <div className="flex items-center justify-center gap-4 border-b border-black p-4">
        <span className=" text-xl">{props.name}</span>
        <span>|</span>
        <span className=" text-center">{props.description}</span>
        <span>|</span>
        <button
          className="text-red-700"
          onClick={() => {
            deletefriend({ id: props.id });
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const FriendsList = (saved_locations: {
  saved_locations: Saved_Location[] | null;
}) => {
  api.saved_locations.getAll.useQuery();
  if (saved_locations.saved_locations !== null) {
    return (
      <div className="flex flex-col p-4">
        <div className="text-center">
          <h1 className="text-2xl">Saved Locations</h1>
          <h1 className="text-sm underline">
            (saved locations appear in search dropdown)
          </h1>
        </div>

        {saved_locations.saved_locations.map((saved_location) => (
          <Saved_LocationView {...saved_location} key={saved_location.id} />
        ))}
      </div>
    );
  } else
    return (
      <div className="flex w-full items-center justify-center">
        Login to save locations!
      </div>
    );
};
const libraries: (
  | "drawing"
  | "geometry"
  | "localContext"
  | "places"
  | "visualization"
)[] = ["places"];

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  const [chatResponse, setChatResponse] = useState<string>("");
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [response, setResponse] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState(false);
  const [isAddressSaved, setIsAddressSaved] = useState(false);
  const [isAddressSaved2, setIsAddressSaved2] = useState(false);
  const { mutate: create } = api.saved_locations.create.useMutation();

  const [friendname, setFriendName] = useState("");
  const [friendname2, setFriendName2] = useState("");
  const [data2, setData2] = useState<Saved_Location[] | null>(null);
  const { data: saved_locations } = api.saved_locations.getAll.useQuery();
  useEffect(() => {
    if (isSignedIn && saved_locations) {
      const data2 = saved_locations.map((value) => {
        return {
          id: value.saved_location.id,
          createdAt: value.saved_location.createdAt,
          userId: value.saved_location.userId,
          name: value.saved_location.name,
          description: value.saved_location.description,
          main_text: value.saved_location.main_text,
          secondary_text: value.saved_location.secondary_text,
          lat: value.saved_location.lat,
          lng: value.saved_location.lng,
        };
      });
      if (saved_locations.length > 0) {
        setData2(data2);
      }
    }
    return;
  }, [saved_locations, isSignedIn]);

  const fetchData = async () => {
    if (centercoords) {
      setResponse("loading");
      const lat = centercoords.lat;
      const lng = centercoords.lng;
      const res = await fetch(`api/ChatGPTRequest?lat=${lat}?lng=${lng}`);
      const data = (await res.json()) as string;

      setResponse("loaded");
      setChatResponse(data);
    } else {
      console.error("Please enter locations");
    }
  };
  function handleFetchData() {
    fetchData()
      .catch((err) => console.error(err))
      .then(() => console.log("this will succeed"))
      .catch(() => "obligatory catch");
  }
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const [selected, setSelected] = useState<{
    description: string;
    main_text: string;
    secondary_text: string;
    lat: number;
    lng: number;
  } | null>(null);

  const [selected2, setSelected2] = useState<{
    description: string;
    main_text: string;
    secondary_text: string;
    lat: number;
    lng: number;
  } | null>(null);

  const [centercoords, setCenterCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [middlepoint, setMiddlePoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  useEffect(() => {
    if (selected) {
      setCenterCoords({ lat: selected.lat, lng: selected.lng });
      console.log("centercoords", centercoords);
    }
  }, [selected]);
  useEffect(() => {
    if (selected2) {
      setCenterCoords({ lat: selected2.lat, lng: selected2.lng });
      console.log("centercoords", centercoords);
    }
  }, [selected2]);
  useEffect(() => {
    if (middlepoint) {
      setCenterCoords({ lat: middlepoint.lat, lng: middlepoint.lng });
      console.log("centercoords", centercoords);
    }
  }, [middlepoint]);

  if (!isLoaded) return <div>Loading...</div>;
  const firstOneIndex = chatResponse.search(/1/);
  const afterOne = chatResponse.substring(firstOneIndex);
  const items = afterOne.split(/\d+\. /).slice(1);

  async function calculateRoute() {
    if (selected === null || selected2 === null) {
      return;
    }
    // eslint-disable-next-line no-undef

    const directionsService = new google.maps.DirectionsService();

    const results = await directionsService.route({
      origin: selected,
      destination: selected2,
      // eslint-disable-next-line no-undef
      travelMode: google.maps.TravelMode.DRIVING,
    });
    setDirectionsResponse(results);

    const LatLngArray = decode(results.routes[0]!.overview_polyline);
    const middleOfArray = LatLngArray[Math.floor(LatLngArray.length / 2)];
    const Objectification = { lat: middleOfArray![0], lng: middleOfArray![1] };

    setMiddlePoint(Objectification);
    setCenterCoords(Objectification);
  }

  function handleCalculateRoute() {
    calculateRoute()
      .catch((err) => console.error(err))
      .then(() => console.log("this will succeed"))
      .catch(() => "obligatory catch");
  }
  function clearRoute() {
    setDirectionsResponse(null);
    setCenterCoords(null);
    setSelected(null);
    setSelected2(null);
  }

  return (
    <>
      <Head>
        <title>Distance Between</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/two_points.png" />
      </Head>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      {infoWindow && (
        <div className="fixed left-[5%] top-[5%] z-50 h-[90%] w-[90%] rounded-xl border border-black bg-white p-8">
          <div
            className="absolute right-2 top-2"
            onClick={() => setInfoWindow(!infoWindow)}
          >
            Close
          </div>
          <div className="bold uppercase underline">How to use:</div>
          <ol className="flex list-decimal flex-col gap-8 p-4">
            <li>
              {" "}
              Enter 2 locations (saved locations appear in dropdown. Sign-in to
              save locations.)
            </li>
            <li>Click "Find Directions" to find the middle point</li>
            <li>
              Below the map, Ask ChatGPT to find things to do around the
              selected point.
            </li>
          </ol>
          <div className="bold uppercase underline ">Signed-in Features:</div>
          <ol className="flex list-disc flex-col gap-8 p-4">
            <li>Save Locations. (saved locations appear in the dropdown)</li>
          </ol>
        </div>
      )}
      <div className="fixed z-10 flex w-full items-center justify-between bg-white p-3">
        <div className="" onClick={() => setInfoWindow(!infoWindow)}>
          Info
        </div>

        <div className="flex gap-4 text-xl uppercase">
          <h1>Distance</h1>
          <img src="/two_points.png" alt="" className="h-8" />
          <h1>Between</h1>
        </div>
        {!isSignedIn && (
          <div className="flex justify-center">
            <SignInButton />
          </div>
        )}
        {isSignedIn && (
          <div className="flex justify-center">
            <UserButton />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-blue-100 to-white py-20">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div>
            <div className="flex flex-col gap-2">
              <h1 className="py-2">First Location:</h1>
              <PlacesAutocomplete
                setSelected={setSelected}
                saved_locations={data2}
              />
              <div>
                {isSignedIn && selected && selected.description !== "" && (
                  <button
                    className="rounded-lg border border-black p-1"
                    onClick={() => setIsAddressSaved(true)}
                  >
                    Save Address
                  </button>
                )}
              </div>
              <div>
                {selected && isAddressSaved && (
                  <div className="flex w-20 gap-3">
                    <input
                      placeholder="Name this location..."
                      className="grow rounded-lg border border-black bg-transparent outline-none"
                      type="text"
                      value={friendname}
                      onChange={(e) => setFriendName(e.target.value)}
                    />
                    <button
                      className="rounded-lg border border-black p-1"
                      onClick={() => {
                        create({
                          content: {
                            name: friendname,
                            description: selected.description,
                            main_text: selected.main_text,
                            secondary_text: selected.secondary_text,
                            lat: selected.lat,
                            lng: selected.lng,
                          },
                        });
                        setIsAddressSaved(false);
                      }}
                    >
                      Save
                    </button>
                    <button onClick={() => setIsAddressSaved(false)}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="py-4">Second Location:</h1>
              <PlacesAutocomplete
                setSelected={setSelected2}
                saved_locations={data2}
              />
              <div>
                {isSignedIn && selected2 && selected2.description !== "" && (
                  <button
                    className="rounded-lg border border-black p-1"
                    onClick={() => setIsAddressSaved2(true)}
                  >
                    Save Address
                  </button>
                )}
              </div>
              <div>
                {selected2 && isAddressSaved2 && (
                  <div className="flex w-20 gap-3">
                    <input
                      placeholder="Name this location..."
                      className="grow rounded-lg border border-black bg-transparent outline-none"
                      type="text"
                      value={friendname2}
                      onChange={(e) => setFriendName2(e.target.value)}
                    />
                    <button
                      className="rounded-lg border border-black p-1"
                      onClick={() => {
                        create({
                          content: {
                            name: friendname2,
                            description: selected2.description,
                            main_text: selected2.main_text,
                            secondary_text: selected2.secondary_text,
                            lat: selected2.lat,
                            lng: selected2.lng,
                          },
                        });
                        setIsAddressSaved2(false);
                      }}
                    >
                      Save
                    </button>
                    <button onClick={() => setIsAddressSaved2(false)}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-12 flex justify-center gap-2">
              <button
                className=" rounded-lg border border-black bg-green-200 p-1"
                onClick={handleCalculateRoute}
              >
                Get Directions
              </button>
              <button
                className="rounded-lg border border-black bg-red-200 p-1"
                onClick={clearRoute}
              >
                Clear Directions
              </button>
            </div>
          </div>
          <div>
            <GoogleMap
              zoom={selected || selected2 ? 13 : 3}
              center={!centercoords ? { lat: 38, lng: -98 } : centercoords}
              mapContainerClassName="flex lg:w-[500px] lg:h-[500px] md:w-[400px] md:h-[400px] w-[300px] h-[300px]"
              onLoad={(map) => setMap(map)}
            >
              {selected && <MarkerF position={selected}>Hello</MarkerF>}
              {selected2 && <MarkerF position={selected2} />}
              {middlepoint && <MarkerF position={middlepoint} />}

              {directionsResponse && (
                <DirectionsRenderer
                  directions={directionsResponse}
                  onLoad={() => console.log("loaded")}
                  options={{ suppressMarkers: true }}
                />
              )}
            </GoogleMap>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            {centercoords &&
              selected &&
              centercoords.lat === selected.lat &&
              centercoords.lng === selected.lng && (
                <div className="flex flex-col items-center justify-center">
                  <div>Things to do around the first location:</div>
                  {response == "" && (
                    <button
                      className="rounded-lg border border-black p-1"
                      onClick={handleFetchData}
                    >
                      Find things to do!
                    </button>
                  )}
                </div>
              )}
            {centercoords &&
              selected2 &&
              centercoords.lat === selected2.lat &&
              centercoords.lng === selected2.lng &&
              (!selected || selected.lat !== centercoords.lat) && (
                <div className="flex flex-col items-center justify-center">
                  <div>Things to do around the second location:</div>
                  {response == "" && (
                    <button
                      className="rounded-lg border border-black p-1"
                      onClick={handleFetchData}
                    >
                      Find things to do!
                    </button>
                  )}
                </div>
              )}

            {centercoords &&
              middlepoint &&
              centercoords.lat === middlepoint.lat &&
              centercoords.lng === middlepoint.lng && (
                <div className="flex flex-col items-center justify-center">
                  <div>
                    Things to do around the{" "}
                    <span className="italic">BETWEEN</span> location:
                  </div>
                  {response == "" && (
                    <button
                      className="rounded-lg border border-black p-1"
                      onClick={handleFetchData}
                    >
                      Find things to do!
                    </button>
                  )}
                </div>
              )}
            <div className="flex flex-col">
              <div className="">
                {response == "loading" && (
                  <div className="flex flex-col items-center gap-4">
                    <h1>Fetching ChatGPT Response</h1>
                    <LoadingSpinner size={60} />
                  </div>
                )}
                {response == "loaded" &&
                  items.map((numberedItem: string, index: number) => (
                    <h1 className="p-2" key={index}>
                      {index + 1}
                      {"."} {numberedItem}
                    </h1>
                  ))}
              </div>
            </div>
          </div>
          {isSignedIn && <FriendsList saved_locations={data2} />}
        </div>
      </div>
    </>
  );
};

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  setSelected,
  saved_locations,
}) => {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete();

  const handleSelect = async (
    description: string,
    main_text: string,
    secondary_text: string
  ) => {
    setValue(description, false);
    clearSuggestions();

    const results = await getGeocode({ address: description }).catch().then();
    const { lat, lng } = getLatLng(results[0]!);
    setSelected({
      description: description,
      main_text: main_text,
      secondary_text: secondary_text,
      lat,
      lng,
    });
  };
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<readonly PlaceType[]>([]);
  const [totalData, setTotalData] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const manipulatedata = function () {
    if (saved_locations) {
      const uniqueArray: google.maps.places.AutocompletePrediction[] = [];
      const results = saved_locations?.map((saved_location, index) => {
        return {
          description: saved_locations[index]!.description,
          structured_formatting: {
            main_text: saved_locations[index]!.name,
            secondary_text: saved_locations[index]!.main_text,
            main_text_matched_substrings: [{ length: 1, offset: 0 }],
          },
          matched_substrings: [{ length: 0, offset: 0 }],
          terms: [],
          types: [],
          place_id: saved_locations[index]!.id,
        };
      });

      results.forEach((item, index) => {
        if (!totalData.includes(item)) {
          uniqueArray.unshift(results[index]!);
        }
      });

      setTotalData([...data, ...uniqueArray]);
    }
    if (!saved_locations) {
      setTotalData([...data]);
    }
  };
  useEffect(() => {
    manipulatedata();
  }, [data, saved_locations]);

  return (
    <Autocomplete
      id="google-map-demo"
      sx={{ width: 300 }}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option.description
      }
      filterOptions={(x) => x}
      options={totalData}
      autoComplete
      includeInputInList
      value={options[0]}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
        setValue(newInputValue);

        manipulatedata();
      }}
      onChange={(event, newValue) => {
        setOptions(newValue ? [newValue, ...options] : options);
        if (newValue !== null) {
          handleSelect(
            newValue.description,
            newValue.structured_formatting.main_text,
            newValue.structured_formatting.secondary_text
          )
            .catch((err) => console.error(err))
            .then(() => console.log("this will succeed"))
            .catch(() => "obligatory catch");
        }
      }}
      renderInput={(params) => (
        <TextField label="Enter an address..." {...params} fullWidth />
      )}
      renderOption={(props, option) => {
        const matches =
          option.structured_formatting.main_text_matched_substrings || [];

        const parts = parse(
          option.structured_formatting.main_text,
          matches.map((match: { offset: number; length: number }) => [
            match.offset,
            match.offset + match.length,
          ])
        );

        return (
          <li {...props}>
            <Grid container alignItems="center">
              <Grid
                item
                sx={{ width: "calc(100% - 44px)", wordWrap: "break-word" }}
              >
                {parts.map((part, index) => (
                  <Box key={index} component="span">
                    {part.text}
                  </Box>
                ))}
                <Typography variant="body2" color="text.secondary">
                  {option.structured_formatting.secondary_text}
                </Typography>
              </Grid>
            </Grid>
          </li>
        );
      }}
    />
  );
};

export default Home;
