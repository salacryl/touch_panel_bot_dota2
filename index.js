/* global __dirname */
/* global process */

import express from "express";
import  { createLogger, format, transports, } from "winston";
import exphbs from "express-handlebars";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import browserSync  from "browser-sync";
import path from "path";
import Dota from './lib/dota';

// init logger
const logger = createLogger({
	format: format.combine(
		format.splat(),
		format.simple()
	),
	transports: [new transports.Console(),],
});

// Get Port
const PORT = process.env.PORT || 5000;
const ENV = process.env.APP_ENV || "dev";


// init App
const app = express();

// init view engine
app.engine("handlebars", exphbs({defaultLayout: "main",}));
app.set("view engine", "handlebars");

// body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, }));

// Method-Override
app.use(methodOverride("_method"));

// publish public folder
app.use(express.static(path.join(__dirname, "/public")));



let dotaClient = new Dota(process.env.STEAM_USERNAME, process.env.STEAM_PASSWORD)



const intervalGetGamesAndRps = () => {
    return dotaClient.requestRichPresence(["76561197970321427"]).then(rps => {
        let lobby_ids = new Set()
        let now = new Date()
		if (!rps.length) return
		rps.forEach(rp => rp.createdAt = now)
		
        rps.filter(rp => rp.WatchableGameID).forEach(rp => lobby_ids.add(rp.WatchableGameID))
        
        
		return dotaClient.requestSourceTVGames({ start_game: 90, lobby_ids: [...lobby_ids] }).then(matches => {
            let now = new Date()
            
            matches = matches.map(match => {
                let item = {
                    average_mmr: match.average_mmr,
                    game_mode: match.game_mode,
                    league_id: match.league_id,
                    //match_id: match.match_id.toString(),
                    lobby_id: match.lobby_id,
                    lobby_type: match.lobby_type,
                    players: match.players,
                    server_steam_id: match.server_steam_id,
                    weekend_tourney_bracket_round: match.weekend_tourney_bracket_round,
                    weekend_tourney_skill_level: match.weekend_tourney_skill_level,
                    createdAt: now
                }
                if (item.players) {
                    item.players = item.players.map(player => ({
                        account_id: player.account_id,
                        hero_id: player.hero_id
                    }))
				}
				console.log(match);
                return item
            })
            return 
     
    }).catch((err) => { console.log(err)})
})
}


let getGamesAndRpsInterval;
getGamesAndRpsInterval = setInterval(intervalGetGamesAndRps, 10000)
process.on('SIGTERM', () => {
	clearInterval(getGamesAndRpsInterval)
	dotaClient.exit()
	process.exit(0)
})
// default route 


app.listen(PORT, () => logger.log("info", "Webservice startet on Port: %d", PORT));

// init browser-sync
logger.log("info", "ENV ist: %s", ENV);
if (ENV==="dev"){
	const bs = browserSync.create();
	bs.init({
		port: PORT+1,
		proxy: {
			target: "localhost:" + PORT,
		},
	});
}
