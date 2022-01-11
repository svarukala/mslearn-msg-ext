import {
    TeamsActivityHandler,
    TurnContext,
    MessageFactory,
    CardFactory, MessagingExtensionAction, MessagingExtensionActionResponse, MessagingExtensionAttachment,
    MessagingExtensionQuery, MessagingExtensionResponse, MessagingExtensionResult, AppBasedLinkQuery
  } from "botbuilder";
  
  import * as Util from "util";
  import * as debug from "debug";
  import { find, sortBy } from "lodash";
  
  const TextEncoder = Util.TextEncoder;
  const log = debug("msteams");
  
  export class PlanetBot extends TeamsActivityHandler {
    protected handleTeamsMessagingExtensionFetchTask(context: TurnContext, action: MessagingExtensionAction): Promise<MessagingExtensionActionResponse> {
        // load planets & sort them by their order from the sun
        const planets: any = require("./planets.json");
        const sortedPlanets: any = sortBy(planets, ["id"])
          .map((planet) => {
            return { value: planet.id, title: planet.name };
          });
      
        // load card template
        const adaptiveCardSource: any = require("./planetSelectorCard.json");
        // locate the planet selector
        const planetChoiceSet: any = find(adaptiveCardSource.body, { id: "planetSelector" });
        // update choice set with planets
        planetChoiceSet.choices = sortedPlanets;
        // load the adaptive card
        const adaptiveCard = CardFactory.adaptiveCard(adaptiveCardSource);
      
        const response: MessagingExtensionActionResponse = {
          task: {
            type: "continue",
            value: {
              card: adaptiveCard,
              title: "Planet Selector",
              height: 150,
              width: 500
            }
          }
        } as MessagingExtensionActionResponse;
      
        return Promise.resolve(response);
      }

      protected handleTeamsMessagingExtensionSubmitAction(context: TurnContext, action: MessagingExtensionAction): Promise<MessagingExtensionActionResponse> {
        switch (action.commandId) {
          case "planetExpanderAction": {
            // load planets
            const planets: any = require("./planets.json");
            // get the selected planet
            const selectedPlanet: any = planets.filter((planet) => planet.id === action.data.planetSelector)[0];
            const adaptiveCard = this.getPlanetDetailCard(selectedPlanet);
      
            // generate the response
            return Promise.resolve({
              composeExtension: {
                type: "result", //message, auth, config
                attachmentLayout: "list",
                attachments: [adaptiveCard]
              }
            } as MessagingExtensionActionResponse);
          }
          default:
            throw new Error("NotImplemented");
        }
      }

      private getPlanetDetailCard(selectedPlanet: any): MessagingExtensionAttachment {
        // load display card
        const adaptiveCardSource: any = require("./planetDisplayCard.json");
      
        // update planet fields in display card
        adaptiveCardSource.actions[0].url = selectedPlanet.wikiLink;
        find(adaptiveCardSource.body, { id: "cardHeader" }).items[0].text = selectedPlanet.name;
        const cardBody: any = find(adaptiveCardSource.body, { id: "cardBody" });
        find(cardBody.items, { id: "planetSummary" }).text = selectedPlanet.summary;
        find(cardBody.items, { id: "imageAttribution" }).text = "*Image attribution: " + selectedPlanet.imageAlt + "*";
        const cardDetails: any = find(cardBody.items, { id: "planetDetails" });
        cardDetails.columns[0].items[0].url = selectedPlanet.imageLink;
        find(cardDetails.columns[1].items[0].facts, { id: "orderFromSun" }).value = selectedPlanet.id;
        find(cardDetails.columns[1].items[0].facts, { id: "planetNumSatellites" }).value = selectedPlanet.numSatellites;
        find(cardDetails.columns[1].items[0].facts, { id: "solarOrbitYears" }).value = selectedPlanet.solarOrbitYears;
        find(cardDetails.columns[1].items[0].facts, { id: "solarOrbitAvgDistanceKm" }).value = Number(selectedPlanet.solarOrbitAvgDistanceKm).toLocaleString();
      
        // return the adaptive card
        return CardFactory.adaptiveCard(adaptiveCardSource);
      }

      protected handleTeamsMessagingExtensionQuery(context: TurnContext, query: MessagingExtensionQuery): Promise<MessagingExtensionResponse> {
          let searchQuery = "";
          if(query && query.parameters && query.parameters[0].name === "searchKeyword" && query.parameters[0].value) {
            searchQuery = query.parameters[0].value.trim().toLowerCase(); //.trim().tolowercase();
          }

          console.log("Search query: " + searchQuery);
          const planets: any = require("./planets.json");
          let queryResults: string[] = [];

          switch (searchQuery) {  
            case "inner":
              queryResults = planets.filter((planet) => planet.id <= 4);
              break;
            case "outer":
                queryResults = planets.filter((planet) => planet.id > 4);
                break;
            default:
              queryResults.push(planets.filter((planet) => planet.name.toLowerCase() === searchQuery)[0]);
            }

            const searchResultsCards: MessagingExtensionAttachment[] = [];
            queryResults.forEach((planet) => {
              searchResultsCards.push(this.getPlanetResultCard(planet));
            });

            const response: MessagingExtensionResponse = {
              composeExtension: {
                type: "result", //message, auth, config
                attachmentLayout: "list",
                attachments: searchResultsCards
              }
            } as MessagingExtensionResponse;

            return Promise.resolve(response);
      }

      private getPlanetResultCard(selectedPanet: any): MessagingExtensionAttachment {
        return CardFactory.heroCard(selectedPanet.name, selectedPanet.summary, [selectedPanet.imageLink]);
      }

      protected handleTeamsAppBasedLinkQuery(context: TurnContext, query: AppBasedLinkQuery): Promise<MessagingExtensionResponse> {
        // load planets
        const planets: any = require("./planets.json");
        // get the selected planet
        const selectedPlanet: any = planets.filter((planet) => planet.wikiLink === query.url)[0];
        const adaptiveCard = this.getPlanetDetailCard(selectedPlanet);
    
        // generate the response
        return Promise.resolve(<MessagingExtensionActionResponse>{
          composeExtension: {
            type: "result",
            attachmentLayout: "list",
            attachments: [adaptiveCard]
          }
        });
      }

  }