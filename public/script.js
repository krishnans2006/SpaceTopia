
//import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.134.0-dfARp6tVCbGvQehLfkdx/mode=imports/optimized/three.js';
//import { OrbitControls } from 'https://cdn.skypack.dev/three@v0.134.0-dfARp6tVCbGvQehLfkdx/examples/jsm/controls/OrbitControls.js';

var socket = io();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();

var WIDTH = document.getElementById("main").offsetWidth;
var HEIGHT = window.innerHeight;

var stars = {};
var selected;
var selectedStar;

window.addEventListener('resize', function() {
	WIDTH = document.getElementById("main").offsetWidth;
	HEIGHT = window.innerHeight;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
});

window.addEventListener('mousemove', function(event) {
    mouse.set( 
        ( ( event.clientX - renderer.domElement.offsetLeft ) / renderer.domElement.width ) * 2 - 1, 
        - ( ( event.clientY - renderer.domElement.offsetTop ) / renderer.domElement.height ) * 2 + 1 
    );
});

document.getElementById("threeContainer").addEventListener('click', function() {
    raycaster.setFromCamera(mouse, camera);
	
	let intersects = raycaster.intersectObjects(scene.children);
	
	if (intersects.length != 0) {
		deselect();
		select(intersects[0].object);
	}
	else if (mouse.x >= -1) {
		deselect();
	}

	renderer.render(scene, camera);
});


function unmute() {
    let audio = document.getElementById('background_audio');
    audio.muted = !audio.muted;
    if (audio.muted) {
        document.getElementById('mute_btn').innerHTML = "<i class=\"fas fa-volume-mute\"></i>";
        audio.pause();
    }
    else {
        document.getElementById('mute_btn').innerHTML = "<i class=\"fas fa-volume-up\"></i>";
        audio.play();
    }
}

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById('threeContainer').appendChild( renderer.domElement );

/*let float_random = Math.random()*2;
const geometry = new THREE.BoxGeometry(0.1,0.1,0.1);
const material = new THREE.MeshBasicMaterial( { color: 	0xFFFFFF} );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );
cube.geometry.parameters;//as above
cube.geometry.parameters.width; //===1
cube.geometry.parameters.widthSegments; // === undefined.*/
camera.position.z = 8;

function addStar(userId, starId, pos, color) {
    const geometry = new THREE.BoxGeometry(0.1,0.1,0.1);
    const material = new THREE.MeshBasicMaterial( { color: color} );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.set(pos.x, pos.y, pos.z);
    cube.userData.userId = userId;
    cube.userData.starId = starId;
    scene.add( cube );
    cube.geometry.parameters; //as above
    cube.geometry.parameters.width; //===1
    cube.geometry.parameters.widthSegments; // === undefined.

    if (stars[userId] == null) {
        stars[userId] = [];
    }
    stars[userId].push(cube);

    renderer.render( scene, camera );
}

const controls = new THREE.OrbitControls(camera, renderer.domElement);
//controls.autoRotate = true;
//controls.target.set( 0, 0.5, 0 );
//controls.update();

/*const animate = function () {
    requestAnimationFrame( animate );

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render( scene, camera );
};

animate();*/

function animate() {
	requestAnimationFrame( animate );

	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();

    renderer.render( scene, camera );
}

animate();

function select(object) {
    if (object.material.color.equals(new THREE.Color(0x00FF00)))
        return;

    selected = object.userData.userId;
    selectedStar = object.userData.starId;

    let selectedStars = stars[selected];

    for (let i = 0; i < selectedStars.length; i++) {
        selectedStars[i].material.color.setHex("0x3CB3C0");
    }

    object.material.color.setHex("0x024064");

    // Update HUD
    document.getElementById("selectedColonies").innerText = "Host Civilization Colonies: " + selectedStars.length;

    socket.emit('select', object.userData.userId);
}

function deselect() {
    if (selected != null) {
        let toDeselect = stars[selected];
        for (let i = 0; i < toDeselect.length; i++) {
            toDeselect[i].material.color.setHex("0xFFFFFF");
        }
    }
    selected = null;

    // Update HUD
    document.getElementById("selectedColonies").innerText = "Host Civilization Colonies:";
    document.getElementById('giveHist').innerText = "";
    document.getElementById('attackHist').innerText = "";
}


// Event listeners
document.getElementById('colonize').addEventListener('click', function() {
    socket.emit('colonize');
});

document.getElementById('givetechbtn').addEventListener('click', function() {
    socket.emit('giveTech', parseInt(document.getElementById('techVal').value), selected);
});

document.getElementById('attackbtn').addEventListener('click', function () {
    socket.emit('attack', parseInt(document.getElementById('techVal').value), selected, selectedStar);
});

// Events
socket.on('add', function(userId, starId, pos) {
    addStar(userId, starId, pos, 0xFFFFFF);
});

socket.on('addAll', function(users) {
    for (let i = 0; i < users.length; i++) {
        for (let s = 0; s < users[i].stars.length; s++) {
            addStar(users[i].id, users[i].stars[s].id, users[i].stars[s].pos, 0xFFFFFF);
        }
    }
});

socket.on('colonize', function(userId, starId, pos, numcolonies, tech) {
    addStar(userId, starId, pos, 0x00FF00);
    document.getElementById('numcolonies').innerText = "Colonies: " + numcolonies;
    document.getElementById('techpersec').innerText = "Resources per Second: " + numcolonies/10;
    document.getElementById('techpercol').innerText = "Resources per Colony: " + tech/numcolonies;
});

socket.on('technology', function(technology, numColonies) {
    if (technology >= 5) {
        document.getElementById('colonize').disabled = false;
    }
    else {
        document.getElementById('colonize').disabled = true;
    }
    document.getElementById('technology').innerText = "Resources: " + technology;
    document.getElementById('techpercol').innerText = "Resources per Colony: " + technology/numColonies;
});

socket.on('techMultiplyer', function(multiplier) {
    document.getElementById('techpersec').innerText = "Resources per Second: " + multiplier/10;
});

socket.on('remove', function(id) {
    for (let i = 0; i < stars[id].length; i++) {
        scene.remove(stars[id][i]);
        delete stars[id][i];
    }
    renderer.render( scene, camera );
});

socket.on('info', function(giveHist, attackHist, giver) {
    if (selected == giver) {
        document.getElementById('giveHist').innerText = giveHist;
        document.getElementById('attackHist').innerText = attackHist;
    }
});

socket.on('transferStar', function(star, oldUser, newUser) {
    for (let i = 0; i < stars[oldUser].length; i++) {
        if (stars[oldUser][i].userData.starId == star) {
            if (stars[newUser][0].material.color.equals(new THREE.Color(0x00FF00)))
                stars[oldUser][i].material.color.setHex("0x00FF00");
            else
                stars[oldUser][i].material.color.setHex("0xFFFFFF");
            
            stars[oldUser][i].userData.userId = newUser;
            stars[newUser].push(stars[oldUser][i]);
            stars[oldUser].splice(i, 1);

            console.log(stars[newUser]);
            console.log(stars[oldUser]);
            break;
        }
    }
});

socket.on('update', function (data) {
    document.getElementById('technology').innerText = "Resources: " + data.technology;
    document.getElementById('numcolonies').innerText = "Colonies: " + data.stars.length;
    document.getElementById('techpersec').innerText = "Resources per Second: " + data.stars.length/10;
    document.getElementById('techpercol').innerText = "Resources per Colony: " + data.technology/data.stars.length;
});