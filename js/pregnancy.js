/*
 * Pregnancy handler
 */

PregType = {
	Undefined : 0,
	Feline    : 1,
	Equine    : 2,
	Lagomorph : 3,
	Lizard    : 4,
	Naga      : 5,
	
	Terry     : 100
};

// Progress
PregnancyLevel = {
	Level1 : 0.1,
	Level2 : 0.3,
	Level3 : 0.5,
	Level4 : 0.7,
	Level5 : 0.9
};

// TODO: Needs some timers/callbacks
function Womb() {
	// In progress offspring
	this.litterSize = 0;
	this.pregType   = PregType.Undefined;
	this.pregnant   = false;
	// TODO: TIMER
	this.progress     = 0;
	this.hoursToBirth = 0;
	this.triggered    = false;
}

Womb.prototype.ToStorage = function() {
	var storage = {
		litS : this.litterSize,
		type : this.pregType,
		hour : this.hoursToBirth.toFixed(2),
		prog : this.progress.toFixed(4)
	};
	return storage;
}

Womb.prototype.FromStorage = function(storage) {
	this.litterSize   = parseInt(storage.litS)   || this.litterSize;
	this.pregType     = parseInt(storage.type)   || this.pregType;
	this.pregnant     = true;
	this.hoursToBirth = parseFloat(storage.hour) || this.hoursToBirth;
	this.progress     = parseFloat(storage.prog) || this.progress;
}

Womb.prototype.Short = function() {
	return "womb";
}
Womb.prototype.Desc = function() {
	
}


function PregnancyHandler(entity, storage) {
	this.entity = entity;
	
	this.gestationRate = new Stat(1);
	this.fertility     = new Stat(0.3);
	
	if(storage) this.FromStorage(storage);
}

PregnancyHandler.Slot = {
	Vag  : 0,
	Butt : 999
};

PregnancyHandler.prototype.ToStorage = function() {
	var storage = {
		gr : this.gestationRate.base.toFixed(2),
		f  : this.fertility.base.toFixed(2)
	};
	
	var womb = [];
	
	var vags = this.entity.AllVags();
	for(var i = 0; i < vags.length; ++i) {
		var w = vags[i].womb;
		if(w && w.pregnant) {
			var s = w.ToStorage();
			s.slot = PregnancyHandler.Slot.Vag + i;
			womb.push(s);
		}
	}
	var w = this.entity.Butt().womb;
	if(w && w.pregnant) {
		var s = w.ToStorage();
		s.slot = PregnancyHandler.Slot.Butt;
		womb.push(s);
	}
	
	if(womb.length > 0)
		storage.womb = womb;
	
	return storage;
}

PregnancyHandler.prototype.FromStorage = function(storage) {
	storage = storage || {};
	if(storage.gr) this.gestationRate.base = parseFloat(storage.gr);
	if(storage.f)  this.fertility.base     = parseFloat(storage.f);
	
	if(storage.womb) {
		var vags = this.entity.AllVags();
		
		for(var i = 0; i < storage.womb.length; ++i) {
			var w    = storage.womb[i];
			var slot = parseInt(w.slot);
			var wPtr = null;
			if(slot >= PregnancyHandler.Slot.Vag && slot < PregnancyHandler.Slot.Butt) {
				var idx = slot - PregnancyHandler.Slot.Vag;
				if((idx >= 0) && (idx < vags.length)) {
					wPtr = vags[idx].womb;
				}
			}
			else if(slot == PregnancyHandler.Slot.Butt)
				wPtr = this.entity.Butt().womb;
			
			if(wPtr) {
				wPtr.FromStorage(w);
			}
		}
	}
}

/*
 * opts:
 * 	slot   := PregnancyHandler.Slot
 */
PregnancyHandler.prototype.Womb = function(opts) {
	opts = opts || {};
	var slot = opts.slot || PregnancyHandler.Slot.Vag;
	var womb = null;
	if     (slot <  PregnancyHandler.Slot.Butt) {
		var vag = this.entity.AllVags()[slot];
		if(vag)
			womb = vag.womb;
	}
	else if(slot == PregnancyHandler.Slot.Butt) womb = this.entity.Butt().womb;
	
	if(womb == null)  return false;

	return womb;
}

/*
 * opts:
 * 	slot   := PregnancyHandler.Slot
 */
PregnancyHandler.prototype.IsPregnant = function(opts) {
	opts = opts || {};
	var slot = opts.slot || PregnancyHandler.Slot.Vag;
	var womb = this.Womb(slot);

	return womb.pregnant;
}

/*
 * opts:
 * 	slot   := PregnancyHandler.Slot
 * 	mother := Entity
 * 	father := Entity
 *  type   := PregType
 * 	num    := 1,2,3...
 * 	time   := time to birth in hours
 *  force  := [optional], bypass fertility
 *  load   := [optional], multiply chances of preg
 */
PregnancyHandler.prototype.Impregnate = function(opts) {
	opts = opts || {};
	var mother = opts.mother || this.entity;
	var father = opts.father;
	
	var slot = opts.slot || PregnancyHandler.Slot.Vag;
	var womb = null;
	if     (slot <  PregnancyHandler.Slot.Butt) {
		var vag = mother.AllVags()[slot];
		if(vag)
			womb = vag.womb;
	}
	else if(slot == PregnancyHandler.Slot.Butt) womb = mother.Butt().womb;
	
	if(womb == null)  return false;
	if(womb.pregnant) return false;
	
	// TODO: Check for sterility, herbs etc
	
	var fertility = (this.fertility.Get() * father.Virility() * Math.sqrt(opts.load || 1));
	if(mother.HasPerk(Perks.Fertility))
		fertility *= 1.5;
	if(father.HasPerk(Perks.Virility))
		fertility *= 1.5;
	var chance = Math.random();
	
	var parse = {
		mother : mother.name,
		father : father.name,
		odds   : fertility,
		chance : chance
	};
	
	if(opts.force || (chance < fertility)) {
		
		// TODO: Adjust litterSize
		var litterSize = opts.num || 1;
		
		if(mother.HasPerk(Perks.Breeder) && Math.random() < 0.3)
			litterSize *= 2;
		if(father.HasPerk(Perks.Breeder) && Math.random() < 0.3)
			litterSize *= 2;
		
		litterSize = Math.floor(litterSize);
		litterSize = Math.max(litterSize, 1);

		var pregType = opts.type || PregType.Undefined;

		var gestationPeriod = opts.time || 24; //TODO TEMP
		
		
		Sex.Preg(father, mother, litterSize);
		
		// TODO: start pregnancy
		womb.pregnant     = true;
		womb.triggered    = false;
		womb.progress     = 0;
		womb.hoursToBirth = gestationPeriod;
		womb.litterSize   = litterSize;
		womb.pregType     = pregType;
		
		parse["size"] = litterSize;
		parse["type"] = pregType;
		parse["time"] = gestationPeriod;
		
		if(DEBUG) {
			Text.NL();
			Text.Add("<b>[father] impregnated [mother], (odds: [chance] < [odds]). Litter size: [size]. Type: [type]. Time: [time] hours.</b>", parse);
			Text.NL();
		}
		
		return true;
	}
	else {
		if(DEBUG) {
			Text.NL();
			Text.Add("<b>[father] did not impregnate [mother], (odds: [chance] >= [odds]).</b>", parse);
			Text.NL();
		}
		return false;
	}
}

PregnancyHandler.prototype.Update = function(hours) {
	hours = hours || 0;
	hours *= this.gestationRate.Get();
	
	var ent = this.entity;
	
	var vags = ent.AllVags();
	for(var i = 0; i < vags.length; ++i) {
		var womb = vags[i].womb;
		var oldProgress = womb.progress;
		if(womb.pregnant && !womb.triggered) {
			womb.progress     += (1-womb.progress) * hours / womb.hoursToBirth;
			womb.hoursToBirth -= hours;
			// Check for completion
			if(womb.hoursToBirth <= 0) {
				womb.triggered = true;
				ent.PregnancyTrigger(womb, PregnancyHandler.Slot.Vag);
			}
			else {
				ent.PregnancyProgess(womb, PregnancyHandler.Slot.Vag, oldProgress, womb.progress);
			}
		}
	}
	var womb = ent.Butt().womb;
	if(womb.pregnant && !womb.triggered) {
		womb.progress     += (1-womb.progress) * hours / womb.hoursToBirth;
		womb.hoursToBirth -= hours;
		// Check for completion
		if(womb.hoursToBirth <= 0) {
			womb.triggered = true;
			ent.PregnancyTrigger(womb, PregnancyHandler.Slot.Butt);
		}
		else {
			ent.PregnancyProgess(womb, PregnancyHandler.Slot.Butt, oldProgress, womb.progress);
		}
	}
}

PregnancyHandler.prototype.BellySize = function() {
	var size = 0;
	
	var vags = this.entity.AllVags();
	for(var i = 0; i < vags.length; ++i) {
		var womb = vags[i].womb;
		if(womb.pregnant) {
			//TODO: adjust for gene size
			size += womb.progress * Math.sqrt(womb.litterSize);
		}
	}
	var womb = this.entity.Butt().womb;
	if(womb.pregnant) {
		//TODO: adjust for gene size
		size += womb.progress * Math.sqrt(womb.litterSize);
	}
	
	return size;
}
