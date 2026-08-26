/* ==========================================================================
   동양연합 영농형 태양광 통합 관제 플랫폼 - 코어 애플리케이션 엔진 (Full Featured)
   (역할 기반 엄격한 권한 제어 RBAC + 발전소 풀 대시보드 + AI 영농행정 연동)
   ========================================================================== */

const DongyangApp = {
  currentPlantId: "12139",
  currentView: "dashboard",
  currentRole: "admin", // 'owner', 'official', 'admin'
  currentUser: null,
  isMobileSimMode: false,
  isDarkMode: false,
  calendarCurrentYear: 2026,
  calendarCurrentMonth: 7,
  currentEquipmentSubTab: 'inverter',
  leafletMap: null,
  markersGroup: null,

  init: function() {
    this.updateTimestamp();
    setInterval(() => this.updateTimestamp(), 1000);

    const checkMobile = () => {
      if (window.innerWidth <= 768 || /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        this.isMobileSimMode = true;
        document.body.classList.add('mobile-sim-mode');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Ctrl + M or F2 Mobile Simulator Toggle
    document.addEventListener('keydown', (e) => {
      const isM = e.code === 'KeyM' || (e.key && (e.key.toLowerCase() === 'm' || e.key === 'ㅡ'));
      if ((e.ctrlKey && isM) || e.key === 'F2') {
        e.preventDefault();
        DongyangApp.toggleMobileSim();
      }
    });

    // Always demand login on app initialization
    this.initAuth();
  },

  // 1. 권한 기반 인증 (RBAC Auth System)
  selectedLoginRole: 'owner12139',

  initAuth: function() {
    this.currentUser = null;
    this.showAuthOverlay();
  },

  showAuthOverlay: function() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.add('active');
      overlay.style.setProperty('display', 'flex', 'important');
      overlay.style.setProperty('visibility', 'visible', 'important');
      overlay.style.setProperty('opacity', '1', 'important');
      overlay.style.setProperty('pointer-events', 'auto', 'important');
    }
  },

  hideAuthOverlay: function() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.setProperty('display', 'none', 'important');
      overlay.style.setProperty('pointer-events', 'none', 'important');
    }
  },

  selectLoginRole: function(roleKey) {
    this.selectedLoginRole = roleKey;
    const btnMap = {
      'owner12139': document.getElementById('roleBtnOwner1'),
      'owner12138': document.getElementById('roleBtnOwner2'),
      'official': document.getElementById('roleBtnOfficial'),
      'admin': document.getElementById('roleBtnAdmin')
    };

    Object.values(btnMap).forEach(b => {
      if (b) {
        b.style.borderColor = 'var(--border-color)';
        b.style.background = 'var(--bg-card)';
        b.style.color = 'var(--text-secondary)';
      }
    });

    const activeBtn = btnMap[roleKey];
    if (activeBtn) {
      activeBtn.style.borderColor = 'var(--sage-primary)';
      activeBtn.style.background = 'rgba(75,107,85,0.12)';
      activeBtn.style.color = 'var(--sage-dark, #3d5a47)';
    }

    const account = USER_ACCOUNTS[roleKey];
    if (account) {
      const idInput = document.getElementById('loginId');
      const roleDesc = document.getElementById('loginRoleDesc');
      if (idInput) idInput.value = account.username;
      if (roleDesc) roleDesc.innerText = account.desc;
    }
  },

  handleLoginSubmit: function(e) {
    if (e) e.preventDefault();
    const account = USER_ACCOUNTS[this.selectedLoginRole] || USER_ACCOUNTS['admin'];
    this.currentUser = account;
    this.currentRole = account.role;

    this.hideAuthOverlay();
    this.applyRolePermissions(account);
    this.updateUserHeader();
  },

  handleLogout: function() {
    this.currentUser = null;
    this.showAuthOverlay();
  },

  updateUserHeader: function() {
    const roleBadge = document.getElementById('userHeaderRoleBadge');
    const authBtn = document.getElementById('userHeaderAuthBtn');
    const authBtnMobile = document.getElementById('userHeaderAuthBtnMobile');
    const oldBadge = document.getElementById('userHeaderBadge');
    
    if (this.currentUser) {
      const roleTag = this.currentUser.role === 'owner' ? '발전사업자' : (this.currentUser.role === 'official' ? '공무원' : '관리자');
      if (roleBadge) {
        roleBadge.innerHTML = `
          <span style="font-size:11.5px; font-weight:800; color:var(--text-primary); background:var(--bg-card-subtle); padding:5px 9px; border-radius:8px; border:1px solid var(--border-color); white-space:nowrap; display:inline-block;">
            ${roleTag}
          </span>
        `;
      }
      const logoutBtnHtml = `<button style="padding:4px 8px; font-size:11px; font-weight:800; background:#d06245; color:#ffffff; border:none; border-radius:6px; cursor:pointer; white-space:nowrap;" onclick="DongyangApp.handleLogout()">로그아웃</button>`;
      if (authBtn) authBtn.innerHTML = logoutBtnHtml;
      if (authBtnMobile) authBtnMobile.innerHTML = logoutBtnHtml;
      if (oldBadge) oldBadge.innerHTML = logoutBtnHtml;
    } else {
      if (roleBadge) roleBadge.innerHTML = '';
      const loginBtnHtml = `<button style="padding:4px 10px; font-size:11.5px; font-weight:800; background:#4b6b55; color:#ffffff; border:none; border-radius:6px; cursor:pointer;" onclick="DongyangApp.showAuthOverlay()">로그인</button>`;
      if (authBtn) authBtn.innerHTML = loginBtnHtml;
      if (authBtnMobile) authBtnMobile.innerHTML = loginBtnHtml;
      if (oldBadge) oldBadge.innerHTML = loginBtnHtml;
    }
  },

  // 2. 역할 기반 권한 제어 (RBAC Menu & View Filter)
  applyRolePermissions: function(account) {
    const role = account.role;
    const plantSelectWrapper = document.querySelector('.plant-select-wrapper select');
    const sidebarNav = document.getElementById('sidebarNavList');
    const roleHeaderBadge = document.getElementById('currentRoleHeaderBadge');

    if (roleHeaderBadge) {
      roleHeaderBadge.innerText = role === 'owner' ? `발전사업자 모드 [${account.plantName}]` : (role === 'official' ? '지자체 영농행정 감독관 모드' : '전체 시스템 관제 모드');
    }


    // A. 발전소 선택 드롭다운 제어
    if (plantSelectWrapper) {
      if (role === 'owner') {
        this.currentPlantId = account.plantId;
        plantSelectWrapper.value = account.plantId;
        plantSelectWrapper.disabled = true;
        plantSelectWrapper.style.opacity = '0.9';
        plantSelectWrapper.style.cursor = 'not-allowed';
        this.selectedComparePlantIds = [account.plantId || '12139']; // 발전 사업자는 기본 1개만 선택
      } else {
        plantSelectWrapper.disabled = false;
        plantSelectWrapper.style.opacity = '1';
        plantSelectWrapper.style.cursor = 'pointer';
        this.currentPlantId = "12139";
        plantSelectWrapper.value = "12139";
        this.selectedComparePlantIds = Object.keys(RASSI_DATA.plants); // 관리자/감독관은 전체 다중 선택
      }
    }


    // B. 권한별 사이드바 메뉴 생성 (Dynamic Navigation Generation)
    if (sidebarNav) {
      let navHtml = '';

      if (role === 'owner') {
        // ⚡ 발전사업자 전용 메뉴 (FULL 발전 성능/설비 모니터링 중심 - 8개 4열 2행)
        navHtml = `
          <li class="nav-item active" data-view="dashboard">
            <a class="nav-link" onclick="DongyangApp.navigate('dashboard')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>
              <span>현재상태</span>
            </a>
          </li>


          <li class="nav-item" data-view="equipment">
            <a class="nav-link" onclick="DongyangApp.navigate('equipment')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v5h5V6H6zm7 0v5h5V6h-5zm-7 7v5h5v-5H6zm7 0v5h5v-5h-5z"/></svg>
              <span>설비</span>
            </a>
          </li>
          <li class="nav-item" data-view="calendar">
            <a class="nav-link" onclick="DongyangApp.navigate('calendar')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
              <span>달력보기</span>
            </a>
          </li>
          <li class="nav-item" data-view="report">
            <a class="nav-link" onclick="DongyangApp.navigate('report')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>보고서</span>
            </a>
          </li>
          <li class="nav-item" data-view="overview">
            <a class="nav-link" onclick="DongyangApp.navigate('overview')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>
              <span>발전소현황</span>
            </a>
          </li>
          <li class="nav-item" data-view="errors">
            <a class="nav-link" onclick="DongyangApp.navigate('errors')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <span>에러정보</span>
            </a>
          </li>
          <li class="nav-item" data-view="comparison">
            <a class="nav-link" onclick="DongyangApp.navigate('comparison')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
              <span>발전소비교</span>
            </a>
          </li>
          <li class="nav-item" data-view="owner-agri-status">
            <a class="nav-link" onclick="DongyangApp.navigate('owner-agri-status')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
              <span>영농이행</span>
            </a>
          </li>
        `;
        this.navigate('dashboard');

      } else if (role === 'official') {
        // 🌾 지자체 공무원 / 감독관 전용 메뉴 (발전사업자 스타일과 100% 동일한 SVG 아이콘 적용)
        navHtml = `
          <li class="nav-item active" data-view="agri-dashboard">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-dashboard')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
              <span>종합대시보드</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-site-detail">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-site-detail')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
              <span>사업장상세</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-risk-center">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-risk-center')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              <span>이상징후</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-video-evidence">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-video-evidence')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              <span>CCTV증빙</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-report-center">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-report-center')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              <span>이행리포트</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-inspection">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-inspection')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
              <span>현장점검</span>
            </a>
          </li>
          <li class="nav-item" data-view="dashboard">
            <a class="nav-link" onclick="DongyangApp.navigate('dashboard')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>
              <span>발전현재</span>
            </a>
          </li>
          <li class="nav-item" data-view="comparison">
            <a class="nav-link" onclick="DongyangApp.navigate('comparison')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
              <span>발전소비교</span>
            </a>
          </li>
        `;
        this.navigate('agri-dashboard');

      } else {
        // 🛠️ 최고 관리자 (`admin` - 통합 풀 메뉴, 발전사업자 스타일과 100% 동일한 SVG 아이콘 적용)
        navHtml = `
          <li class="nav-item active" data-view="agri-dashboard">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-dashboard')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
              <span>종합대시보드</span>
            </a>
          </li>
          <li class="nav-item" data-view="dashboard">
            <a class="nav-link" onclick="DongyangApp.navigate('dashboard')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>
              <span>현재상태</span>
            </a>
          </li>
          <li class="nav-item" data-view="equipment">
            <a class="nav-link" onclick="DongyangApp.navigate('equipment')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v5h5V6H6zm7 0v5h5V6h-5zm-7 7v5h5v-5H6zm7 0v5h5v-5h-5z"/></svg>
              <span>설비</span>
            </a>
          </li>
          <li class="nav-item" data-view="calendar">
            <a class="nav-link" onclick="DongyangApp.navigate('calendar')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
              <span>달력보기</span>
            </a>
          </li>
          <li class="nav-item" data-view="report">
            <a class="nav-link" onclick="DongyangApp.navigate('report')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>보고서</span>
            </a>
          </li>
          <li class="nav-item" data-view="overview">
            <a class="nav-link" onclick="DongyangApp.navigate('overview')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>
              <span>발전소현황</span>
            </a>
          </li>
          <li class="nav-item" data-view="errors">
            <a class="nav-link" onclick="DongyangApp.navigate('errors')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <span>에러정보</span>
            </a>
          </li>
          <li class="nav-item" data-view="comparison">
            <a class="nav-link" onclick="DongyangApp.navigate('comparison')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
              <span>발전소비교</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-site-detail">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-site-detail')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
              <span>사업장상세</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-risk-center">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-risk-center')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              <span>이상징후</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-video-evidence">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-video-evidence')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              <span>CCTV증빙</span>
            </a>
          </li>
          <li class="nav-item" data-view="agri-report-center">
            <a class="nav-link" onclick="DongyangApp.navigate('agri-report-center')">
              <svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              <span>이행리포트</span>
            </a>
          </li>
        `;
        this.navigate('agri-dashboard');
      }



      sidebarNav.innerHTML = navHtml;
    }

    this.switchPlant(this.currentPlantId);
  },

  // 3. 뷰 전환 및 화면 바인딩 (Navigation)
  navigate: function(viewId) {
    this.currentView = viewId;

    const sidebar = document.querySelector('.left-sidebar');
    if (sidebar && sidebar.classList.contains('drawer-open')) {
      sidebar.classList.remove('drawer-open');
    }

    // Always reset scroll to top on page navigation
    window.scrollTo(0, 0);
    const appEl = document.getElementById('app');
    if (appEl) appEl.scrollTop = 0;

    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.dataset.view === viewId) el.classList.add('active');
      else el.classList.remove('active');
    });

    document.querySelectorAll('.view-section').forEach(el => {
      el.classList.remove('active');
      el.style.display = 'none';
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
      targetView.style.display = 'block';
    }

    if (viewId === 'dashboard') {
      const plantData = RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"];
      setTimeout(() => RassiCharts.updatePlantCharts(plantData), 100);
    } else if (viewId === 'equipment') {
      this.renderEquipmentTable();
    } else if (viewId === 'calendar') {
      this.renderCalendarGrid();
    } else if (viewId === 'report') {
      this.renderReportView();
    } else if (viewId === 'errors') {
      this.renderErrorLogsTable();
    } else if (viewId === 'comparison') {
      this.renderCompareTable();
    } else if (viewId === 'agri-dashboard') {
      this.renderAgriDashboard();
      setTimeout(() => {
        this.initLeafletMap();
        if (this.leafletMap) {
          this.leafletMap.invalidateSize();
          this.fitAllSites();
        }
        if (typeof AgriCharts !== 'undefined' && AgriCharts.initDashboardCharts) {
          AgriCharts.initDashboardCharts();
        }
      }, 150);
    } else if (viewId === 'agri-site-detail') {
      this.renderAgriSiteDetail(this.currentPlantId);
    } else if (viewId === 'agri-risk-center') {
      this.renderAgriRiskCenter(this.currentPlantId);
    } else if (viewId === 'agri-video-evidence') {
      this.renderAgriVideoEvidence(this.currentPlantId);
    } else if (viewId === 'agri-report-center') {
      this.renderAgriReportCenter(this.currentPlantId);
    }
  },




  renderAgriDashboard: function() {
    if (typeof AGRI_ADMIN_DATA === 'undefined') return;
    const summary = AGRI_ADMIN_DATA.summary;
    if (!summary) return;

    const elTot = document.getElementById('statTotalSites');
    const elNor = document.getElementById('statNormalSites');
    const elWat = document.getElementById('statWatchSites');
    const elIns = document.getElementById('statInspectionSites');
    const elAct = document.getElementById('statActionSites');

    if (elTot) elTot.textContent = summary.totalSites;
    if (elNor) elNor.textContent = summary.normalSites;
    if (elWat) elWat.textContent = summary.watchSites;
    if (elIns) elIns.textContent = summary.inspectionSites;
    if (elAct) elAct.textContent = summary.actionSites;

    // Render Priority Watchlist
    const watchListContainer = document.getElementById('priorityWatchlistContainer');
    if (watchListContainer && AGRI_ADMIN_DATA.priorityWatchlist) {
      watchListContainer.innerHTML = AGRI_ADMIN_DATA.priorityWatchlist.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card-subtle); padding:12px 14px; border-radius:12px; border:1px solid var(--border-color); cursor:pointer;" onclick="DongyangApp.navigate('agri-site-detail')">
          <div style="flex:1; min-width:0; padding-right:8px;">
            <strong style="font-size:13.5px; color:var(--text-primary); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</strong>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:3px; line-height:1.4;">${item.issue}</div>
          </div>
          <span class="badge ${item.badge}" style="font-weight:800; padding:4px 10px; flex-shrink:0;">${item.level}</span>
        </div>
      `).join('');
    }

    // Render Recent Reports Table
    const tableBody = document.getElementById('recentReportsTableBody');
    if (tableBody && AGRI_ADMIN_DATA.recentReports) {
      tableBody.innerHTML = AGRI_ADMIN_DATA.recentReports.map(rep => `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="font-weight:800; text-align:left; padding:12px 16px; color:var(--text-primary); font-size:13px;">${rep.name}</td>
          <td style="padding:12px 14px; text-align:center; color:var(--text-secondary); font-weight:700; font-size:12.5px;">${rep.crop}</td>
          <td style="padding:12px 14px; text-align:center; font-weight:800; color:var(--text-primary); font-size:12.5px;">${rep.events}</td>
          <td style="padding:12px 14px; text-align:center; font-weight:800; color:var(--text-primary); font-size:12.5px;">${rep.area}</td>
          <td style="padding:12px 14px; text-align:center;">
            <span class="badge ${rep.badge}" style="font-weight:800; padding:5px 12px; border-radius:14px; font-size:11.5px;">${rep.result}</span>
          </td>
          <td style="padding:12px 14px; text-align:center;">
            <button style="padding:5px 14px; font-size:11.5px; background:#27372b; color:#ffffff; border:none; border-radius:14px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(0,0,0,0.15);" onclick="DongyangApp.navigate('agri-report-center')">
              <i class="fa-solid fa-file-lines"></i> 보기
            </button>
          </td>
        </tr>
      `).join('');
    }
  },

  renderAgriSiteDetail: function(siteId) {
    if (typeof AGRI_ADMIN_DATA === 'undefined' || !AGRI_ADMIN_DATA.sites) return;
    const validId = (siteId && AGRI_ADMIN_DATA.sites[siteId]) ? siteId : (this.currentPlantId || '12139');
    const site = AGRI_ADMIN_DATA.sites[validId] || AGRI_ADMIN_DATA.sites['12139'];
    if (!site) return;

    const titleEl = document.getElementById('siteDetailTitle');
    const breadcrumbEl = document.getElementById('siteDetailBreadcrumb');
    const badgeEl = document.getElementById('siteDetailStatusBadge');

    if (titleEl) titleEl.textContent = site.name;
    if (breadcrumbEl) breadcrumbEl.textContent = `사업장 / ${site.code}`;
    if (badgeEl) {
      badgeEl.textContent = site.status;
      badgeEl.className = `badge ${site.statusBadge}`;
    }

    const elScore = document.getElementById('detailKpiScore');
    const elCrop = document.getElementById('detailKpiCrop');
    const elArea = document.getElementById('detailKpiArea');
    const elEvents = document.getElementById('detailKpiEvents');
    const elInactive = document.getElementById('detailKpiInactive');


    if (elScore) elScore.textContent = site.complianceScore;
    if (elCrop) {
      elCrop.textContent = `${site.permitCrop || '콩'} (94% 일치)`;
      elCrop.style.color = site.cropMatch ? '#10b981' : '#f59e0b';
    }
    if (elArea) elArea.textContent = `${site.areaRatio}%`;
    if (elEvents) elEvents.textContent = `${site.eventsCount}건`;
    if (elInactive) elInactive.textContent = `${site.inactiveDays}일`;

    // Permit Info Comparison
    const pCrop = document.getElementById('permitCropName');
    const aiCrop = document.getElementById('aiCropName');
    const pArea = document.getElementById('permitAreaSize');
    const aArea = document.getElementById('actualAreaSize');
    const oStatus = document.getElementById('otherUseStatus');

    if (pCrop) pCrop.textContent = site.permitCrop;
    if (aiCrop) {
      aiCrop.textContent = `${site.permitCrop || '콩'} (일치율 94%)`;
      aiCrop.style.color = site.cropMatch ? '#10b981' : '#f59e0b';
    }
    if (pArea) pArea.textContent = `${site.permitArea ? site.permitArea.toLocaleString() : 4000} ㎡`;
    if (aArea) aArea.textContent = `${site.actualArea ? site.actualArea.toLocaleString() : 3400} ㎡ (${site.areaRatio}%)`;
    if (oStatus) oStatus.textContent = site.otherUseCount === 0 ? "없음 (미탐지)" : "의심 탐지";

    // Activities Table
    const tableBody = document.getElementById('detailActivitiesTableBody');
    if (tableBody && site.timeline) {
      tableBody.innerHTML = site.timeline.map(act => `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="font-weight:700; padding:10px 12px; text-align:center; white-space:nowrap;">${act.date}</td>
          <td style="font-weight:800; color:var(--sage-primary); padding:10px 12px; text-align:center; white-space:nowrap;">${act.title}</td>
          <td style="padding:10px 12px; text-align:center; white-space:nowrap;">${act.cam}</td>
          <td style="padding:10px 12px; text-align:center; font-weight:800; color:#10b981; white-space:nowrap;">${act.confidence}</td>
          <td style="padding:10px 12px; text-align:center; white-space:nowrap;"><span class="badge ${act.review === '인정' ? 'badge-success' : 'badge-warning'}" style="font-weight:800; padding:4px 10px;">${act.review}</span></td>
        </tr>
      `).join('');
    }

    // Anomaly Text Box
    const textAnomaly = document.getElementById('detailAnomalyText');
    if (textAnomaly) {
      textAnomaly.textContent = site.anomalyDesc || (site.anomalies && site.anomalies[0] ? `${site.anomalies[0].title}: ${site.anomalies[0].desc}` : "북측 경계부 미경작 의심구역이 전월 대비 2.1% 증가했습니다. 즉시 위반으로 판단하지 않고 다음 보고기간에 변화 추이를 재확인하도록 권고합니다.");
    }

    this.switchAgriSubTab(this.currentAgriSubTab || 'overview', false);
  },

  requestPhotoEvidence: function() {
    const site = (typeof AGRI_ADMIN_DATA !== 'undefined' && AGRI_ADMIN_DATA.sites) ? (AGRI_ADMIN_DATA.sites[this.currentPlantId || '12139']) : null;
    const plantName = site ? site.name : '해당 발전소';
    alert(`[알림 발송 완료]\n\n${plantName} 관리자(소유주)에게 '생육 초기 작물 근접 사진 및 재배 증빙 제출 요청' 모바일 알림톡이 성공적으로 발송되었습니다.`);
  },

  scheduleInspection: function() {
    const site = (typeof AGRI_ADMIN_DATA !== 'undefined' && AGRI_ADMIN_DATA.sites) ? (AGRI_ADMIN_DATA.sites[this.currentPlantId || '12139']) : null;
    const plantName = site ? site.name : '해당 발전소';
    alert(`[현장 점검 배정 완료]\n\n${plantName}에 대한 '지자체 2분기 정기 합동 현장점검(작물 식별 및 수광 확인)' 일정이 감독관 캘린더에 정식 등록되었습니다.`);
  },

  currentAgriSubTab: 'overview',

  switchAgriSubTab: function(tabName, isUserClick = true) {
    this.currentAgriSubTab = tabName;
    const tabs = ['overview', 'activity', 'permit', 'action'];
    tabs.forEach(t => {
      const btn = document.getElementById(`subtab-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.style.background = 'var(--sage-primary)';
          btn.style.color = '#ffffff';
          btn.style.borderColor = 'var(--sage-primary)';
          btn.style.boxShadow = '0 3px 10px rgba(61,90,71,0.25)';
          btn.classList.add('active');
        } else {
          btn.style.background = 'var(--bg-card-subtle)';
          btn.style.color = 'var(--text-primary)';
          btn.style.borderColor = 'var(--border-color)';
          btn.style.boxShadow = 'none';
          btn.classList.remove('active');
        }
      }
    });

    const mainGrid = document.querySelector('.agri-detail-main-grid');
    const topKpi = document.getElementById('siteDetailTopKpi');
    const actSection = document.getElementById('detailActivitiesSection');
    const perSection = document.getElementById('detailPermitSection');
    const anomSection = document.getElementById('detailAnomaliesSection');

    // 2. 다른 카드가 사라지지 않고 전체 레이아웃 그대로 유지 (Never hide any cards)
    if (mainGrid) mainGrid.style.display = 'grid';
    if (topKpi) topKpi.style.display = 'grid';
    if (actSection) actSection.style.display = 'block';
    if (perSection) perSection.style.display = 'block';
    if (anomSection) anomSection.style.display = 'block';

    // 3. 기존 포커스 효과 제거
    [topKpi, actSection, perSection, anomSection].forEach(el => {
      if (el) el.classList.remove('card-focus-active');
    });

    // 4. 선택된 탭에 대응하는 카드 타겟 지정 (사용자가 직접 클릭한 경우에만 스크롤)
    let targetCard = null;
    if (tabName === 'overview') {
      targetCard = topKpi;
    } else if (tabName === 'activity') {
      targetCard = actSection;
    } else if (tabName === 'permit') {
      targetCard = perSection;
    } else if (tabName === 'action') {
      targetCard = anomSection;
    }

    if (targetCard) {
      targetCard.classList.add('card-focus-active');

      // 사용자가 탭을 직접 클릭했을 때만 해당 위치로 부드럽게 스크롤 (초기 진입 시에는 최상단 유지)
      if (isUserClick && tabName !== 'overview') {
        setTimeout(() => {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
  },

  renderAgriRiskCenter: function(siteId) {
    if (typeof AGRI_ADMIN_DATA === 'undefined' || !AGRI_ADMIN_DATA.sites) return;
    const validId = (siteId && AGRI_ADMIN_DATA.sites[siteId]) ? siteId : (this.currentPlantId || '12139');
    const site = AGRI_ADMIN_DATA.sites[validId] || AGRI_ADMIN_DATA.sites['12139'];
    if (!site) return;

    const elBreadcrumb = document.getElementById('riskCenterBreadcrumb');
    const elStatusBadge = document.getElementById('riskCenterStatusBadge');
    const cardsContainer = document.getElementById('riskCardsContainer');
    const tableBody = document.getElementById('complianceTableBody');

    if (elBreadcrumb) {
      elBreadcrumb.textContent = `강원특별자치도 영농형 태양광 리포트 & 법령 검토 · ${site.name}`;
    }
    if (elStatusBadge) {
      elStatusBadge.textContent = site.status === '정상 이행' ? '정상 이행 사업장' : '관찰 대상 사업장';
      elStatusBadge.className = `badge ${site.statusBadge || 'badge-warning'}`;
    }

    // Plant-specific Anomaly Risk Cards Definition
    const plantRiskData = {
      "12139": {
        cards: [
          { title: "장기 무활동", desc: `연속 무활동 일수가 허용 기준(14일 이내: ${site.inactiveDays}일)을 충족함.`, badge: "정상 (미탐지)", badgeClass: "badge-success" },
          { title: "작물 불일치", desc: `신고작물(${site.permitCrop})과 실제 영상 탐지 작물이 94% 일치함.`, badge: "일치 (정상)", badgeClass: "badge-success" },
          { title: "미경작구역 증가", desc: "북측 경계 부근 일부 미경작 징후 관찰되어 재확인 권고.", badge: "관찰 (+2.1%)", badgeClass: "badge-warning" },
          { title: "차량 장기주차", desc: "농지 내 방치 차량 미탐지.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "자재·폐기물 적치", desc: "농지 타용도 자재 적치 없음.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "카메라 장애", desc: "카메라 4대 신호 수신 가동률 100%.", badge: "양호 (정상)", badgeClass: "badge-success" }
        ],
        compliance: [
          { item: "영농의무", evidence: `영농 이벤트 ${site.eventsCount}건 탐지 (경운·파종·제초)`, aiResult: "이행", decision: "인정", badgeClass: "badge-success" },
          { item: "적합작물 재배의무", evidence: `신고작물 ${site.permitCrop} / 영상확인 ${site.aiCrop} (일치율 94%)`, aiResult: "일치", decision: "인정", badgeClass: "badge-success" },
          { item: "농지 타용도 사용금지", evidence: "장기주차·적치 미탐지 (북측 2.1% 관찰)", aiResult: "관찰 권고", decision: "보류 (관찰)", badgeClass: "badge-warning" },
          { item: "발전설비 영농방해", evidence: "작업동선 및 트랙터 접근성 확보", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" }
        ]
      },
      "12138": {
        cards: [
          { title: "장기 무활동", desc: `연속 무활동 일수 ${site.inactiveDays}일로 지속적 영농 활동 중.`, badge: `정상 (${site.inactiveDays}일)`, badgeClass: "badge-success" },
          { title: "작물 불일치", desc: `신고작물(${site.permitCrop})과 영상 탐지 작물 98% 일치.`, badge: "일치 (최우수)", badgeClass: "badge-success" },
          { title: "미경작구역 증가", desc: "미경작 면적 없음 (실경작률 92%).", badge: "정상 (0.0%)", badgeClass: "badge-success" },
          { title: "차량 장기주차", desc: "재배구역 내 차량 방치 없음.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "자재·폐기물 적치", desc: "농자재 정돈 양호, 불법 폐기물 미탐지.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "카메라 장애", desc: "카메라 3대 전 채널 정상 송출 중.", badge: "양호 (100%)", badgeClass: "badge-success" }
        ],
        compliance: [
          { item: "영농의무", evidence: `영농 이벤트 ${site.eventsCount}건 탐지 (경운·파종 완수)`, aiResult: "이행 (최우수)", decision: "인정", badgeClass: "badge-success" },
          { item: "적합작물 재배의무", evidence: `신고작물 ${site.permitCrop} / 영상확인 ${site.aiCrop} (일치율 98%)`, aiResult: "일치", decision: "인정", badgeClass: "badge-success" },
          { item: "농지 타용도 사용금지", evidence: "불법 시설물 및 타용도 전용 없음", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" },
          { item: "발전설비 영농방해", evidence: "트랙터 회전 반경 4.5m 유지", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" }
        ]
      },
      "12140": {
        cards: [
          { title: "장기 무활동", desc: `연속 무활동 ${site.inactiveDays}일 감지 (허용 14일 이내 관리 중).`, badge: `관찰 (${site.inactiveDays}일)`, badgeClass: "badge-warning" },
          { title: "작물 불일치", desc: `신고작물(${site.permitCrop}) 모종 정식 작업 확인됨.`, badge: "정식 확인", badgeClass: "badge-success" },
          { title: "미경작구역 증가", desc: "동측 배수로 인근 미경작 의심구역 1.5% 증가.", badge: "관찰 (+1.5%)", badgeClass: "badge-warning" },
          { title: "차량 장기주차", desc: "농기계 출입로 일시 주차 외 특이사항 없음.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "자재·폐기물 적치", desc: "비닐 멀칭 폐자재 수거 완료.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "카메라 장애", desc: "CAM02 렌즈 이물질 세척 권장.", badge: "주의 (점검요망)", badgeClass: "badge-warning" }
        ],
        compliance: [
          { item: "영농의무", evidence: `영농 이벤트 ${site.eventsCount}건 탐지 (물대기·정식 완료)`, aiResult: "이행", decision: "인정", badgeClass: "badge-success" },
          { item: "적합작물 재배의무", evidence: `신고작물 ${site.permitCrop} / 모종 정식 이행 완료`, aiResult: "일치", decision: "인정", badgeClass: "badge-success" },
          { item: "농지 타용도 사용금지", evidence: "동측 경계부 1.5% 미경작 관찰", aiResult: "관찰 권고", decision: "보류 (관찰)", badgeClass: "badge-warning" },
          { item: "발전설비 영농방해", evidence: "이앙기 진입 통로 확보 상태 양호", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" }
        ]
      },
      "12141": {
        cards: [
          { title: "장기 무활동", desc: `연속 무활동 ${site.inactiveDays}일로 최고 빈도 관리 유지.`, badge: `최우수 (${site.inactiveDays}일)`, badgeClass: "badge-success" },
          { title: "작물 불일치", desc: `과수(${site.permitCrop}) 생육 및 전정 작업 확인.`, badge: "일치 (99%)", badgeClass: "badge-success" },
          { title: "미경작구역 증가", desc: "과수 전 구역 100% 정상 관리 중.", badge: "정상 (0.0%)", badgeClass: "badge-success" },
          { title: "차량 장기주차", desc: "작업용 SS분무기 외 방치 차량 없음.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "자재·폐기물 적치", desc: "과수 전정 가지 전량 파쇄 처리 완료.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "카메라 장애", desc: "고해상도 PTZ 카메라 5대 전원 가동 중.", badge: "양호 (100%)", badgeClass: "badge-success" }
        ],
        compliance: [
          { item: "영농의무", evidence: `영농 이벤트 ${site.eventsCount}건 탐지 (전정·시비·방제 완수)`, aiResult: "이행 (최상)", decision: "인정", badgeClass: "badge-success" },
          { item: "적합작물 재배의무", evidence: `신고작물 ${site.permitCrop} / 과수 수형 관리 정상`, aiResult: "일치", decision: "인정", badgeClass: "badge-success" },
          { item: "농지 타용도 사용금지", evidence: "타용도 사용 및 방치 흔적 전무", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" },
          { item: "발전설비 영농방해", evidence: "구조물 하부 고상식 과수로 방해 없음", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" }
        ]
      },
      "12142": {
        cards: [
          { title: "장기 무활동", desc: `연속 무활동 ${site.inactiveDays}일 (허용 기준 충족).`, badge: `정상 (${site.inactiveDays}일)`, badgeClass: "badge-success" },
          { title: "작물 불일치", desc: "두류 계열 유사 엽형 감지 (세부 품종 확인 필요).", badge: "유사 감지", badgeClass: "badge-warning" },
          { title: "미경작구역 증가", desc: "수변 경계 구역 정상 식재 완료.", badge: "정상 (0.0%)", badgeClass: "badge-success" },
          { title: "차량 장기주차", desc: "농기계 이동로 개방 유지.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "자재·폐기물 적치", desc: "농자재 적치 없음.", badge: "미탐지", badgeClass: "badge-success" },
          { title: "카메라 장애", desc: "카메라 2대 정상 통신 중.", badge: "양호 (100%)", badgeClass: "badge-success" }
        ],
        compliance: [
          { item: "영농의무", evidence: `영농 이벤트 ${site.eventsCount}건 탐지 (경운·파종 완료)`, aiResult: "이행", decision: "인정", badgeClass: "badge-success" },
          { item: "적합작물 재배의무", evidence: `신고작물 ${site.permitCrop} / 두류 유사 엽형 감지 (신뢰도 68%)`, aiResult: "유사작물 (확인필요)", decision: "보류 (사진요청)", badgeClass: "badge-warning" },
          { item: "농지 타용도 사용금지", evidence: "타용도 사용 미탐지", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" },
          { item: "발전설비 영농방해", evidence: "소형 관리기 작업 동선 확보", aiResult: "이상 없음", decision: "인정", badgeClass: "badge-success" }
        ]
      }
    };

    const currentPlantRisk = plantRiskData[validId] || plantRiskData["12139"];

    // 1. Render 6 Risk Cards
    if (cardsContainer) {
      cardsContainer.innerHTML = currentPlantRisk.cards.map(card => `
        <div style="background:var(--bg-card); padding:18px; border-radius:14px; border:1.5px solid var(--border-color); box-shadow:0 2px 6px rgba(0,0,0,0.02);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="font-size:14.5px; font-weight:900; color:var(--text-primary);">${card.title}</strong>
            <span class="badge ${card.badgeClass}" style="font-size:11.5px; font-weight:800; padding:4px 10px;">${card.badge}</span>
          </div>
          <p style="font-size:12.5px; color:var(--text-muted); margin:0; line-height:1.5; font-weight:600;">${card.desc}</p>
        </div>
      `).join('');
    }

    // 2. Render Legal Compliance Table
    if (tableBody) {
      tableBody.innerHTML = currentPlantRisk.compliance.map(row => `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="font-weight:800; padding:12px 14px; text-align:left; color:var(--text-primary);">${row.item}</td>
          <td style="padding:12px 14px; text-align:left; color:var(--text-secondary); font-weight:600;">${row.evidence}</td>
          <td style="padding:12px 14px; text-align:center; font-weight:800; color:var(--text-primary);">${row.aiResult}</td>
          <td style="padding:12px 14px; text-align:center;">
            <span class="badge ${row.badgeClass}" style="font-weight:800; padding:4px 12px;">${row.decision}</span>
          </td>
        </tr>
      `).join('');
    }
  },

  renderAgriVideoEvidence: function(siteId) {
    if (typeof AGRI_ADMIN_DATA === 'undefined' || !AGRI_ADMIN_DATA.sites) return;
    const validId = (siteId && AGRI_ADMIN_DATA.sites[siteId]) ? siteId : (this.currentPlantId || '12139');
    const site = AGRI_ADMIN_DATA.sites[validId] || AGRI_ADMIN_DATA.sites['12139'];
    if (!site) return;

    // Plant-specific Camera Evidence Data Map (All 5 Plants)
    const evidenceData = {
      "12139": {
        cam: "CAM03 (남측 경작구역)",
        timestamp: "2027.03.28 10:42:16",
        gps: "37.3422, 127.9201",
        classification: "농기계 작업 및 파종",
        confidence: "94%",
        confidenceBadge: "badge-success",
        workers: "2명",
        machinery: "1대 (경운기)",
        zone: "B구역 (남측 진입로)",
        permitCrop: "콩",
        box1: "작업자 0.98",
        box2: "농기계(경운기) 0.96",
        basis: [
          "작업자 2명 연속 탐지",
          "농기계 이동 궤적 확인",
          "경작구역 내 반복 작업 패턴",
          "비농업적 주차·적치 패턴과 불일치"
        ],
        reviewer: "강원도 영농 감독관 (김○○ 주무관)",
        reviewTime: "2027.04.03 14:21",
        reviewStatus: "인정",
        reviewBadge: "badge-success"
      },
      "12138": {
        cam: "CAM01 (A구역 북측)",
        timestamp: "2027.04.05 11:30:22",
        gps: "37.3380, 127.9150",
        classification: "군락 생육 및 엽면 점검",
        confidence: "98%",
        confidenceBadge: "badge-success",
        workers: "3명",
        machinery: "1대 (트랙터)",
        zone: "A구역 (북측 경작지)",
        permitCrop: "옥수수",
        box1: "작업자 0.97",
        box2: "작물군락(옥수수) 0.98",
        basis: [
          "옥수수 군락 피복률 78% 확인",
          "작업자 3명 제초 및 배수로 정비",
          "정상 영농 이행 패턴 일치",
          "차광 영향 없는 균일 생장"
        ],
        reviewer: "강원도 영농 감독관 (박○○ 주무관)",
        reviewTime: "2027.04.06 10:15",
        reviewStatus: "인정",
        reviewBadge: "badge-success"
      },
      "12140": {
        cam: "CAM02 (C구역 동측)",
        timestamp: "2027.04.02 10:30:45",
        gps: "37.3850, 127.9950",
        classification: "모종 정식 및 1차 제초",
        confidence: "93%",
        confidenceBadge: "badge-success",
        workers: "2명",
        machinery: "1대 (이앙기)",
        zone: "C구역 (동측 경작구)",
        permitCrop: "마늘/양파",
        box1: "작업자 0.95",
        box2: "이앙기/농기구 0.93",
        basis: [
          "모종 정식 작업자 2명 탐지",
          "이앙기 이동 및 두둑 피복 확인",
          "동측 경계 미경작부 1.5% 관찰 권고",
          "CAM02 렌즈 세척 후 재확인 요망"
        ],
        reviewer: "강원도 영농 감독관 (이○○ 주무관)",
        reviewTime: "2027.04.04 15:40",
        reviewStatus: "인정",
        reviewBadge: "badge-success"
      },
      "12141": {
        cam: "CAM01 (과수 전 구역)",
        timestamp: "2027.04.15 14:00:10",
        gps: "37.4917, 127.9846",
        classification: "과수 인공 수분 및 전정 관리",
        confidence: "99%",
        confidenceBadge: "badge-success",
        workers: "4명",
        machinery: "1대 (SS분무기)",
        zone: "과수 전 구역 (고상식)",
        permitCrop: "사과/인삼",
        box1: "작업자 0.99",
        box2: "과수/사다리 0.98",
        basis: [
          "전정 및 수분 작업자 4명 탐지",
          "SS분무기 방제 동선 확보",
          "모듈 하부 과수 수형 관리 우수",
          "수확량 표준 80% 요건 충족 예상"
        ],
        reviewer: "강원도 영농 감독관 (최○○ 주무관)",
        reviewTime: "2027.04.16 09:30",
        reviewStatus: "인정",
        reviewBadge: "badge-success"
      },
      "12142": {
        cam: "CAM01 (남측 재배구)",
        timestamp: "2027.04.02 11:20:05",
        gps: "37.8813, 127.6521",
        classification: "새순 엽형 분석 (유사 감지)",
        confidence: "68%",
        confidenceBadge: "badge-warning",
        workers: "0명 (센서 감지)",
        machinery: "0대",
        zone: "남측 재배구역",
        permitCrop: "콩 (두류)",
        box1: "작물(두류 유사) 0.68",
        box2: "식별보류 구역",
        basis: [
          "두류 계열(콩/완두) 유사 잎 형상 감지",
          "원거리 해상도 한계로 품종 특정 불명확",
          "사업자 근접 촬영 사진 제출 요청",
          "현장점검 배정 권고"
        ],
        reviewer: "강원도 영농 감독관 (정○○ 주무관)",
        reviewTime: "2027.04.03 11:10",
        reviewStatus: "보류",
        reviewBadge: "badge-warning"
      }
    };

    const cur = evidenceData[validId] || evidenceData["12139"];

    // Update Elements
    const elBreadcrumb = document.getElementById('videoEvidenceBreadcrumb');
    const elOsdTimestamp = document.getElementById('cctvOsdTimestamp');
    const elCaptureDateTime = document.getElementById('cctvCaptureDateTime');
    const elBox1 = document.getElementById('cctvBox1Label');
    const elBox2 = document.getElementById('cctvBox2Label');
    const elCamBadge = document.getElementById('cctvCamTimestampBadge');
    const elFooter = document.getElementById('cctvFooterInfo');
    const elTitle = document.getElementById('cctvAiClassificationTitle');
    const elConfidence = document.getElementById('cctvAiConfidenceBadge');
    const elWorkers = document.getElementById('cctvWorkerCount');
    const elMachinery = document.getElementById('cctvMachineryCount');
    const elZone = document.getElementById('cctvZoneName');
    const elPermitCrop = document.getElementById('cctvPermitCropName');
    const elBasisList = document.getElementById('cctvDecisionBasisList');
    const elReviewer = document.getElementById('cctvReviewerName');
    const elReviewTime = document.getElementById('cctvReviewTime');
    const elReviewBadge = document.getElementById('cctvReviewBadge');

    if (elBreadcrumb) elBreadcrumb.textContent = `${site.name} / ${cur.cam} (촬영일시: ${cur.timestamp})`;
    if (elOsdTimestamp) elOsdTimestamp.textContent = `${cur.timestamp} KST`;
    if (elCaptureDateTime) elCaptureDateTime.textContent = cur.timestamp;
    if (elBox1) elBox1.textContent = cur.box1;
    if (elBox2) elBox2.textContent = cur.box2;
    if (elCamBadge) elCamBadge.textContent = `🔴 REC · ${cur.cam}`;
    if (elFooter) elFooter.textContent = `📅 촬영 일시: ${cur.timestamp} · 📍 GPS ${cur.gps} · 🔒 원본 영상 무결성 보존`;
    if (elTitle) elTitle.textContent = cur.classification;
    if (elConfidence) {
      elConfidence.textContent = `신뢰도 ${cur.confidence}`;
      elConfidence.className = `badge ${cur.confidenceBadge}`;
    }
    if (elWorkers) elWorkers.textContent = cur.workers;
    if (elMachinery) elMachinery.textContent = cur.machinery;
    if (elZone) elZone.textContent = cur.zone;
    if (elPermitCrop) elPermitCrop.textContent = cur.permitCrop;

    if (elBasisList) {
      elBasisList.innerHTML = cur.basis.map(b => `<li>· ${b}</li>`).join('');
    }
    if (elReviewer) elReviewer.textContent = cur.reviewer;
    if (elReviewTime) elReviewTime.textContent = cur.reviewTime;
    if (elReviewBadge) {
      elReviewBadge.textContent = cur.reviewStatus;
      elReviewBadge.className = `badge ${cur.reviewBadge}`;
    }

  },

  makeDecision: function(decision) {
    const elReviewBadge = document.getElementById('cctvReviewBadge');
    if (elReviewBadge) {
      elReviewBadge.textContent = decision;
      elReviewBadge.className = `badge ${decision === '인정' ? 'badge-success' : (decision === '보류' ? 'badge-warning' : 'badge-danger')}`;
    }
    alert(`[검토 완료]\n\n해당 영상 증빙 건에 대하여 '${decision}' 처리가 완료되었습니다.`);
  },

  applyEvidenceToReport: function() {
    alert('[리포트 반영 완료]\n\n해당 AI CCTV 영상 증빙 데이터가 4월 정기점검 행정보고서에 공식 채택·반영되었습니다.');
  },

  // 3.8. 영농이행 정기점검 리포트 센터 5개 발전소 동기화 렌더링
  renderAgriReportCenter: function(plantId) {
    const validId = plantId || this.currentPlantId || "12139";
    const site = (typeof AGRI_ADMIN_DATA !== 'undefined' && AGRI_ADMIN_DATA.sites[validId]) ? AGRI_ADMIN_DATA.sites[validId] : (AGRI_ADMIN_DATA?.sites?.["12139"] || { name: "[12139][원주] 온누리3,4 (200kW)" });
    if (!site) return;

    const reportData = {
      "12139": {
        siteTitle: `사업장: [12139][원주] 온누리3,4 (200kW)`,
        permitNo: `허가번호 2027-AGPV-12139 · 관리기관 강원특별자치도 / 원주시`,
        evidence: `📷 AI CAMERA 03 · 2027.03.28 10:42 CCTV 영상 썸네일 증빙 완료`,
        result: `정상`,
        resultBadge: `영농의무 이행`,
        badgeClass: `badge-success`,
        resultDesc: `신고작물(콩)과 실제 작물이 일치하며 주요 영농활동(파종·제초 27건)이 지속적으로 확인되었습니다.`
      },
      "12138": {
        siteTitle: `사업장: [12138][원주] 온누리1,2 (200kW)`,
        permitNo: `허가번호 2027-AGPV-12138 · 관리기관 강원특별자치도 / 원주시`,
        evidence: `📷 AI CAMERA 01 · 2027.04.05 11:30 CCTV 영상 썸네일 증빙 완료`,
        result: `정상`,
        resultBadge: `영농의무 이행`,
        badgeClass: `badge-success`,
        resultDesc: `신고작물(옥수수) 실경작면적 92% 달성 및 모듈 하부 균일 생장이 양호하게 확인되었습니다.`
      },
      "12140": {
        siteTitle: `사업장: [12140][원주] 온누리5,6 (300kW)`,
        permitNo: `허가번호 2027-AGPV-12140 · 관리기관 강원특별자치도 / 원주시`,
        evidence: `📷 AI CAMERA 02 · 2027.04.02 10:30 CCTV 영상 썸네일 증빙 완료`,
        result: `관찰 필요`,
        resultBadge: `관찰 대상`,
        badgeClass: `badge-warning`,
        resultDesc: `신고작물(마늘) 재배 중이나, 동측 경계부 미경작 징후(1.5%)가 관찰되어 차기 점검 권고.`
      },
      "12141": {
        siteTitle: `사업장: [12141][횡성] 청정영농형1호 (500kW)`,
        permitNo: `허가번호 2027-AGPV-12141 · 관리기관 강원특별자치도 / 횡성군`,
        evidence: `📷 AI CAMERA 01 · 2027.04.15 14:00 CCTV 영상 썸네일 증빙 완료`,
        result: `정상`,
        resultBadge: `영농의무 우수`,
        badgeClass: `badge-success`,
        resultDesc: `신고작물(사과/인삼) 고상식 모듈 하부 수형 전정 및 SS분무기 방제 동선이 우수하게 관리됨.`
      },
      "12142": {
        siteTitle: `사업장: [12142][춘천] 소양강 영농태양광 (150kW)`,
        permitNo: `허가번호 2027-AGPV-12142 · 관리기관 강원특별자치도 / 춘천시`,
        evidence: `📷 AI CAMERA 01 · 2027.04.02 11:20 CCTV 영상 썸네일 증빙 완료`,
        result: `정상 (관찰)`,
        resultBadge: `추가 증빙 권고`,
        badgeClass: `badge-warning`,
        resultDesc: `신고작물(콩) 새순 유사 감지(68%) 상태로 사업자 근접 사진 보충 제출 권고.`
      }
    };

    const cur = reportData[validId] || reportData["12139"];

    const elSiteTitle = document.getElementById('reportSiteTitle');
    const elPermitNo = document.getElementById('reportPermitNo');
    const elEvidence = document.getElementById('reportThumbnailEvidence');
    const elResult = document.getElementById('reportMonthlyResult');
    const elResultBadge = document.getElementById('reportResultBadge');
    const elResultDesc = document.getElementById('reportResultDesc');

    if (elSiteTitle) elSiteTitle.textContent = cur.siteTitle;
    if (elPermitNo) elPermitNo.textContent = cur.permitNo;
    if (elEvidence) elEvidence.textContent = cur.evidence;
    if (elResult) {
      elResult.textContent = cur.result;
      elResult.style.color = cur.badgeClass === 'badge-success' ? '#10b981' : '#f59e0b';
    }
    if (elResultBadge) {
      elResultBadge.textContent = cur.resultBadge;
      elResultBadge.className = `badge ${cur.badgeClass}`;
    }
    if (elResultDesc) elResultDesc.textContent = cur.resultDesc;
  },








  // 4. 발전소 데이터 100% 동기화 (Full Switcher Engine)
  switchPlant: function(plantId) {
    this.currentPlantId = plantId;
    const plant = RASSI_DATA.plants[plantId] || RASSI_DATA.plants["12139"];
    const agriData = AGRI_ADMIN_DATA.sites[plantId] || AGRI_ADMIN_DATA.sites["12139"];

    // Update Dropdown Sync
    document.querySelectorAll('#plantSelect').forEach(s => {
      if (s.value !== plantId) s.value = plantId;
    });

    // 1. Weather Strip Sync
    const elPlantBadge = document.getElementById('dyn-plant-name-badge');
    if (elPlantBadge) elPlantBadge.textContent = plant.name + ' 발전소 현황';

    const elWeatherCond = document.getElementById('dyn-weather-cond');
    if (elWeatherCond) elWeatherCond.textContent = plant.weatherCond || '☀️ 맑음';

    const elWeatherTemp = document.getElementById('dyn-weather-temp');
    if (elWeatherTemp) elWeatherTemp.textContent = plant.cardTemp || '28.2°C';

    const elWeatherHumidity = document.getElementById('dyn-weather-humidity');
    if (elWeatherHumidity) elWeatherHumidity.textContent = plant.humidity || '62%';

    const elWeatherWind = document.getElementById('dyn-weather-wind');
    if (elWeatherWind) elWeatherWind.textContent = plant.windSpeed || '1.2m/s';

    // 2. 발전량(kWh) 기반 실시간 자동 금융/환경 지표 연산 (KPX SMP/REC + 온실가스 배출계수 0.4781 kgCO2/kWh)
    const fin = (typeof computePlantFinancials === 'function') ? computePlantFinancials(plant) : {
      todayRevenueMan: (plant.todayRevenueMan || 5.9).toString(),
      todaySmpText: plant.cardTodaySmp || '45,587 원',
      todayRecText: plant.cardTodayRec || '24,993 원',
      todayTotalText: plant.cardTodayTotal || '70,580 원',
      monthlySmpText: plant.cardMonthlySmp || '200.7 만원',
      monthlyRecText: plant.cardMonthlyRec || '110.0 만원',
      monthlyTotalText: plant.cardMonthlyTotal || '310.8 만원',
      totalRecRevenueText: plant.cardTotalRec || '3,231 만원',
      co2Kg: Math.round(plant.todayGenKwh * 0.4781),
      co2Ton: (plant.todayGenKwh * 0.4781 / 1000).toFixed(2),
      treeCount: Math.round(plant.todayGenKwh * 0.072)
    };

    const eff = ((plant.currentPowerKw / plant.capacityKw) * 100).toFixed(1);
    const genRatio = ((plant.todayGenKwh / (plant.targetGenKwh || 400)) * 100).toFixed(1);

    const monthlyGenVal = parseFloat(String(plant.monthlyGenKwh || '15323').replace(/[^0-9.]/g, '')) || (plant.todayGenKwh * 30);
    const yearlyGenVal = Math.round(monthlyGenVal * 12);
    const totalGenVal = Math.round(plant.capacityKw * 3.6 * 365 * 6.5);

    const monthlyCo2Ton = (monthlyGenVal * 0.4781 / 1000).toFixed(1);
    const yearlyCo2Ton = (yearlyGenVal * 0.4781 / 1000).toFixed(1);
    const totalCo2Ton = (totalGenVal * 0.4781 / 1000).toFixed(1);

    // 3. Update 4 Hero KPIs & Gauge Bars
    const elPower = document.getElementById('kpi-current-power');
    const elGen = document.getElementById('kpi-today-gen');
    const elRev = document.getElementById('kpi-today-rev');
    const elCo2 = document.getElementById('kpi-co2-reduced');
    const elEff = document.getElementById('kpi-efficiency');
    const elTargetGen = document.getElementById('kpi-target-gen');
    const elGenRatio = document.getElementById('kpi-gen-ratio');
    const elCo2Kg = document.getElementById('kpi-co2-kg');

    if (elPower) elPower.textContent = plant.currentPowerKw.toFixed(1);
    if (elGen) elGen.textContent = plant.todayGenKwh.toLocaleString();
    if (elRev) elRev.textContent = fin.todayRevenueMan;
    if (elCo2) elCo2.textContent = fin.co2Ton;
    if (elEff) elEff.textContent = eff + '%';
    if (elTargetGen) elTargetGen.textContent = plant.targetGenKwh;
    if (elGenRatio) elGenRatio.textContent = genRatio + '%';
    if (elCo2Kg) elCo2Kg.textContent = fin.co2Kg + ' kgCO₂';

    const effBar = document.getElementById('kpi-efficiency-bar');
    if (effBar) effBar.style.width = Math.min(100, Math.max(10, eff * 3)) + '%';
    const genBar = document.getElementById('kpi-gen-ratio-bar');
    if (genBar) genBar.style.width = Math.min(100, Math.max(10, genRatio)) + '%';

    // 4. Asset & Revenue Cards
    const elAssetTodayRev = document.getElementById('asset-today-rev');
    const elAssetMonthlyRev = document.getElementById('asset-monthly-rev');
    const elAssetYearlyRev = document.getElementById('asset-yearly-rev');
    const elAssetTotalRev = document.getElementById('asset-total-rev');

    const elAssetTodayCo2 = document.getElementById('asset-today-co2');
    const elAssetMonthlyCo2 = document.getElementById('asset-monthly-co2');
    const elAssetYearlyCo2 = document.getElementById('asset-yearly-co2');
    const elAssetTotalCo2 = document.getElementById('asset-total-co2');

    const monthlyRevMan = (parseFloat(fin.todayRevenueMan) * 30).toFixed(0);
    const yearlyRevMan = (parseFloat(fin.todayRevenueMan) * 365).toFixed(0);
    const totalRevEok = (plant.capacityKw * 0.74).toFixed(2);

    if (elAssetTodayRev) elAssetTodayRev.textContent = fin.todayRevenueMan + ' 만원';
    if (elAssetMonthlyRev) elAssetMonthlyRev.textContent = fin.monthlyTotalText || (monthlyRevMan + ' 만원');
    if (elAssetYearlyRev) elAssetYearlyRev.textContent = yearlyRevMan + ' 만원';
    if (elAssetTotalRev) elAssetTotalRev.textContent = totalRevEok + ' 억원';

    if (elAssetTodayCo2) elAssetTodayCo2.textContent = 'CO₂: ' + fin.co2Kg + ' kgCO₂';
    if (elAssetMonthlyCo2) elAssetMonthlyCo2.textContent = 'CO₂: ' + monthlyCo2Ton + ' tCO₂';
    if (elAssetYearlyCo2) elAssetYearlyCo2.textContent = 'CO₂: ' + yearlyCo2Ton + ' tCO₂';
    if (elAssetTotalCo2) elAssetTotalCo2.textContent = 'CO₂: ' + totalCo2Ton + ' tCO₂';


    // 5. Update AI Banner Message
    const aiSubject = document.querySelector('.ai-banner-subject');
    const aiDesc = document.querySelector('.ai-banner-desc');
    if (aiSubject) aiSubject.textContent = plant.aiSubject;
    if (aiDesc) aiDesc.textContent = plant.aiDesc;

    // 6. Render Inverter Mini Table
    this.renderInverterMiniTable(plant);

    // 6.5. Update Plant Overview Card (Image 2 Full Spec)
    this.updatePlantOverviewCard();


    // 7. Update Owner Agri Compliance Status Card
    const ownerAgriBadge = document.getElementById('owner-agri-status-badge');
    if (ownerAgriBadge) {
      ownerAgriBadge.innerText = agriData.status;
      ownerAgriBadge.className = `badge ${agriData.statusBadge}`;
    }

    this.renderCalendarGrid();
    this.renderReportView();
    this.renderAgriSiteDetail(plantId);
    this.renderAgriRiskCenter(plantId);
    this.renderAgriVideoEvidence(plantId);
    this.renderAgriReportCenter(plantId);

    // 8. GIS 지적 지도 실시간 동기화 (선택한 발전소 위치로 부드럽게 이동 & 팝업 열기)
    if (this.leafletMap && agriData && agriData.lat && agriData.lng) {
      this.leafletMap.invalidateSize();
      const isMobile = window.innerWidth <= 768 || document.body.classList.contains('mobile-sim-mode');
      const targetZoom = isMobile ? 10.0 : 10.8;
      const targetLat = isMobile ? (agriData.lat + 0.002) : agriData.lat;

      this.leafletMap.flyTo([targetLat, agriData.lng], targetZoom, {
        animate: true,
        duration: 0.8
      });
      const marker = this.siteMarkers ? this.siteMarkers[plantId] : null;
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 400);
      }
    }

    if (this.currentView === 'dashboard') {
      RassiCharts.updatePlantCharts(plant);
    } else if (this.currentView === 'equipment') {
      this.renderEquipmentTable();
    } else if (this.currentView === 'errors') {
      this.renderErrorLogsTable();
    } else if (this.currentView === 'report') {
      this.renderReportView();
    } else if (this.currentView === 'agri-site-detail') {
      this.renderAgriSiteDetail(plantId);
    } else if (this.currentView === 'agri-risk-center') {
      this.renderAgriRiskCenter(plantId);
    } else if (this.currentView === 'agri-video-evidence') {
      this.renderAgriVideoEvidence(plantId);
    } else if (this.currentView === 'agri-report-center') {
      this.renderAgriReportCenter(plantId);
    }
  },

  switchPlantAndNavigate: function(plantId, viewId) {
    this.switchPlant(plantId);
    this.navigate(viewId);
  },






  renderInverterMiniTable: function(plant) {
    const tbody = document.getElementById('inverterMiniTable');
    if (!tbody) return;

    const inverters = plant.inverters || [
      { id: 1, powerKw: 9.6, runHours: 1.3, todayGenKwh: 78, state: "가동", comm: "17:15:09" },
      { id: 2, powerKw: 8.3, runHours: 1.1, todayGenKwh: 67, state: "가동", comm: "17:15:10" },
      { id: 3, powerKw: 9.6, runHours: 1.3, todayGenKwh: 78, state: "가동", comm: "17:15:09" },
      { id: 4, powerKw: 8.3, runHours: 1.1, todayGenKwh: 68, state: "가동", comm: "17:15:10" }
    ];

    tbody.innerHTML = inverters.map(inv => `
      <tr>
        <td>#${inv.id}</td>
        <td><strong>${inv.powerKw}</strong></td>
        <td>${inv.runHours}</td>
        <td>${inv.todayGenKwh}</td>
        <td><span class="badge badge-success">${inv.state}</span></td>
        <td style="font-size:11px; color:var(--text-muted);">${inv.comm}</td>
      </tr>
    `).join('');
  },

  toggleCardView: function(cardType, viewType) {
    const chartBox = document.getElementById(`${cardType}-chart-box`);
    const tableBox = document.getElementById(`${cardType}-table-box`);
    const btnChart = document.getElementById(`btn-${cardType}-chart`);
    const btnTable = document.getElementById(`btn-${cardType}-table`);

    if (viewType === 'chart') {
      if (chartBox) chartBox.style.display = 'block';
      if (tableBox) tableBox.style.display = 'none';
      if (btnChart) { btnChart.classList.add('active'); btnChart.style.background = '#0284c7'; btnChart.style.color = '#fff'; }
      if (btnTable) { btnTable.classList.remove('active'); btnTable.style.background = 'var(--bg-card-subtle)'; btnTable.style.color = 'var(--text-muted)'; }
    } else {
      if (chartBox) chartBox.style.display = 'none';
      if (tableBox) tableBox.style.display = 'block';
      if (btnTable) { btnTable.classList.add('active'); btnTable.style.background = '#0284c7'; btnTable.style.color = '#fff'; }
      if (btnChart) { btnChart.classList.remove('active'); btnChart.style.background = 'var(--bg-card-subtle)'; btnChart.style.color = 'var(--text-muted)'; }
    }
  },

  // 5. Leaflet 지적 지도 통합 엔진 (Leaflet Interactive GIS Map)
  siteMarkers: {},

  fitAllSites: function() {
    if (!this.leafletMap || typeof AGRI_ADMIN_DATA === 'undefined' || !AGRI_ADMIN_DATA.sites) return;
    this.leafletMap.invalidateSize();
    const siteList = Object.values(AGRI_ADMIN_DATA.sites).filter(s => s.lat && s.lng);
    if (siteList.length === 0) return;
    const bounds = L.latLngBounds(siteList.map(s => [s.lat, s.lng]));
    this.leafletMap.fitBounds(bounds, { padding: [45, 45], maxZoom: 9.5, animate: true });
  },

  filterMapByStatus: function(statusType) {
    if (!this.leafletMap || typeof AGRI_ADMIN_DATA === 'undefined' || !AGRI_ADMIN_DATA.sites) return;

    // 1. Highlight active KPI Card
    ['all', 'normal', 'watch', 'inspection', 'action'].forEach(type => {
      const cardId = 'kpiCard' + type.charAt(0).toUpperCase() + type.slice(1);
      const card = document.getElementById(cardId);
      if (card) {
        if (type === statusType) {
          card.style.outline = '2.5px solid var(--sage-primary)';
          card.style.background = 'var(--bg-card-subtle)';
          card.style.boxShadow = '0 6px 20px rgba(61,90,71,0.2)';
        } else {
          card.style.outline = 'none';
          card.style.background = 'var(--bg-card)';
          card.style.boxShadow = 'none';
        }
      }
    });

    this.leafletMap.invalidateSize();

    if (statusType === 'watch') {
      const watchLatLngs = [];
      Object.keys(AGRI_ADMIN_DATA.sites).forEach(siteId => {
        const site = AGRI_ADMIN_DATA.sites[siteId];
        const marker = this.siteMarkers[siteId];
        if (marker) {
          if (site.status.includes('관찰')) {
            if (!this.markersGroup.hasLayer(marker)) this.markersGroup.addLayer(marker);
            watchLatLngs.push([site.lat, site.lng]);
          } else {
            if (this.markersGroup.hasLayer(marker)) this.markersGroup.removeLayer(marker);
          }
        }
      });

      if (watchLatLngs.length > 0) {
        const bounds = L.latLngBounds(watchLatLngs);
        this.leafletMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 11.5, animate: true });
      }

    } else if (statusType === 'normal') {
      const normalLatLngs = [];
      Object.keys(AGRI_ADMIN_DATA.sites).forEach(siteId => {
        const site = AGRI_ADMIN_DATA.sites[siteId];
        const marker = this.siteMarkers[siteId];
        if (marker) {
          if (site.status.includes('정상')) {
            if (!this.markersGroup.hasLayer(marker)) this.markersGroup.addLayer(marker);
            normalLatLngs.push([site.lat, site.lng]);
          } else {
            if (this.markersGroup.hasLayer(marker)) this.markersGroup.removeLayer(marker);
          }
        }
      });

      if (normalLatLngs.length > 0) {
        const bounds = L.latLngBounds(normalLatLngs);
        this.leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 9.5, animate: true });
      }

    } else if (statusType === 'inspection' || statusType === 'action') {
      alert(`[안내] 현재 ${statusType === 'inspection' ? '현장점검' : '시정 검토'} 대상 사업장은 0건입니다.`);
    } else {
      // 'all'
      Object.keys(AGRI_ADMIN_DATA.sites).forEach(siteId => {
        const marker = this.siteMarkers[siteId];
        if (marker && !this.markersGroup.hasLayer(marker)) {
          this.markersGroup.addLayer(marker);
        }
      });
      this.fitAllSites();
    }
  },

  initLeafletMap: function() {
    const mapContainer = document.getElementById('realLeafletMap');
    if (!mapContainer || typeof L === 'undefined') return;

    if (this.leafletMap) {
      this.fitAllSites();
      return;
    }

    this.leafletMap = L.map('realLeafletMap', {
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; 동양연합 영농형 태양광 GIS'
    }).addTo(this.leafletMap);

    this.markersGroup = L.layerGroup().addTo(this.leafletMap);
    this.siteMarkers = {};

    Object.values(AGRI_ADMIN_DATA.sites).forEach(site => {
      const isWatch = site.status.includes('관찰');
      const markerColor = isWatch ? '#f59e0b' : '#10b981';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background:${markerColor}; color:#ffffff; padding:6px 14px; border-radius:20px; font-weight:900; font-size:12px; border:2.5px solid #ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.35); white-space:nowrap; display:inline-flex; align-items:center; gap:6px; box-sizing:border-box; width:max-content;">
            <span>🌾</span> <span>${site.code}</span> <span style="opacity:0.95; font-size:11px; font-weight:800;">(${site.complianceScore}점)</span>
          </div>
        `,
        iconSize: null,
        iconAnchor: [75, 18]
      });

      const marker = L.marker([site.lat, site.lng], { icon: customIcon }).addTo(this.markersGroup);
      this.siteMarkers[site.id] = marker;

      marker.on('click', () => {
        DongyangApp.switchPlant(site.id);
      });

      marker.bindPopup(`
        <div style="padding:6px; font-family:sans-serif; min-width:180px;">
          <h4 style="margin:0 0 6px 0; font-size:14px; color:#1d3324; font-weight:900;">${site.name}</h4>
          <p style="margin:2px 0; font-size:12px; color:#526759;">허가작물: <strong>${site.permitCrop}</strong> | 이행점수: <strong style="color:${markerColor}">${site.complianceScore}점</strong></p>
          <p style="margin:2px 0; font-size:11.5px; color:#64748b;">주소: ${site.address}</p>
          <button style="margin-top:8px; padding:6px 12px; background:#3d5a47; color:#fff; border:none; border-radius:6px; font-size:11.5px; font-weight:bold; cursor:pointer; width:100%;" onclick="DongyangApp.switchPlantAndNavigate('${site.id}', 'agri-site-detail')">🔍 사업장 상세 관제 이동</button>
        </div>
      `);
    });

    setTimeout(() => this.fitAllSites(), 200);
  },



  // Helpers & Calendar / Table Renders
  calendarCurrentYear: 2026,
  calendarCurrentMonth: 7,

  onCalendarSelectChange: function() {
    const yrEl = document.getElementById('calendarYearSelect');
    const moEl = document.getElementById('calendarMonthSelect');
    if (yrEl) this.calendarCurrentYear = parseInt(yrEl.value, 10);
    if (moEl) this.calendarCurrentMonth = parseInt(moEl.value, 10);
    this.renderCalendarGrid();
  },

  jumpToTodayCalendar: function() {
    this.calendarCurrentYear = 2026;
    this.calendarCurrentMonth = 7;
    const yrEl = document.getElementById('calendarYearSelect');
    const moEl = document.getElementById('calendarMonthSelect');
    if (yrEl) yrEl.value = "2026";
    if (moEl) moEl.value = "7";
    this.renderCalendarGrid();
  },

  renderCalendarGrid: function() {
    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;

    const plant = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.plants) ? (RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"]) : null;
    const plantName = plant ? (plant.shortName || plant.name.replace(/^\[.*?\]\s*/, '')) : '온누리3,4';
    const plantCap = plant ? plant.capacityKw : 200;
    const plantIdNum = parseInt(this.currentPlantId || '12139', 10);

    const yr = this.calendarCurrentYear || 2026;
    const mo = this.calendarCurrentMonth || 7;

    const titleEl = document.getElementById('calendarTitleHeader');
    if (titleEl) {
      titleEl.textContent = `${yr}년 ${mo}월 발전량 달력 (${plantName} - ${plantCap}kW)`;
    }

    const yrEl = document.getElementById('calendarYearSelect');
    const moEl = document.getElementById('calendarMonthSelect');
    if (yrEl) yrEl.value = yr.toString();
    if (moEl) moEl.value = mo.toString();

    const firstDayIndex = new Date(yr, mo - 1, 1).getDay();
    const totalDays = new Date(yr, mo, 0).getDate();

    let html = '';
    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div class="calendar-day-cell empty-cell"></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
      // Calculate plant-specific dynamic generation based on plant capacity and plant ID seed
      const baseGen = plantCap * 3.4;
      const seed = (day * 43 + mo * 17 + plantIdNum * 13) % 100;
      const genFactor = 0.7 + (seed / 100) * 0.6; // 0.7 ~ 1.3 variation
      const gen = Math.round(baseGen * genFactor);
      const rev = (gen * 0.0203).toFixed(1);

      html += `
        <div class="calendar-day-cell" onclick="DongyangApp.openDailyReportModal(${day})">
          <div class="day-num">${day}</div>
          <div class="day-stats">
            <div class="gen-text">${gen.toLocaleString()}<span style="font-size:10.5px; font-weight:700;">kWh</span></div>
            <div class="rev-text">${rev}<span style="font-size:10px; font-weight:700;">만원</span></div>
          </div>
        </div>
      `;
    }

    const totalCellsSoFar = firstDayIndex + totalDays;
    const remainingEmpty = (7 - (totalCellsSoFar % 7)) % 7;
    for (let i = 0; i < remainingEmpty; i++) {
      html += `<div class="calendar-day-cell empty-cell"></div>`;
    }

    grid.innerHTML = html;
  },

  renderReportView: function() {
    const reportSubTitle = document.getElementById('reportSubTitle');
    const reportMonthlyGen = document.getElementById('reportMonthlyGen');
    const reportPrIndex = document.getElementById('reportPrIndex');
    const reportMonthlyRev = document.getElementById('reportMonthlyRev');
    const reportSmpRecBreakdown = document.getElementById('reportSmpRecBreakdown');
    const reportCo2 = document.getElementById('reportCo2');
    const reportPineTrees = document.getElementById('reportPineTrees');
    const reportAvgGenHours = document.getElementById('reportAvgGenHours');
    const reportOperRate = document.getElementById('reportOperRate');
    const reportAiBox = document.getElementById('reportAiBox');
    const reportTableBody = document.getElementById('reportTableBody');

    if (!reportSubTitle || !reportTableBody) return;

    const plant = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.plants) ? (RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"]) : null;
    if (!plant) return;

    const plantId = plant.id;
    const plantName = plant.shortName || plant.name;
    const capKw = plant.capacityKw || 200;

    reportSubTitle.textContent = `[${plantName}] 2026년 7월 정기 종합 보고서`;

    // Monthly factors (1월 ~ 7월)
    const monthlyFactors = [
      { month: '1월', factor: 62.25, days: 31 },
      { month: '2월', factor: 69.0, days: 28 },
      { month: '3월', factor: 81.0, days: 31 },
      { month: '4월', factor: 87.5, days: 30 },
      { month: '5월', factor: 92.0, days: 31 },
      { month: '6월', factor: 84.5, days: 30 },
      { month: '7월 (현재)', factor: 76.615, days: 31 }
    ];

    let julGenKwh = 0;
    let julSmpWon = 0;
    let julRecWon = 0;
    let julTotalWon = 0;
    let julAvgHours = 0;

    const tableRowsHtml = monthlyFactors.map((mInfo, idx) => {
      const isJul = idx === 6;
      // Introduce slight plant-specific variation using plant capacity & ID
      const plantVariation = 1.0 + ((parseInt(plantId, 10) % 5) - 2) * 0.015;
      const genKwh = Math.round(capKw * mInfo.factor * plantVariation);
      const avgHours = (genKwh / capKw / mInfo.days).toFixed(2);
      const smpWon = Math.round(genKwh * 131.0);
      const recWon = Math.round(genKwh * 71.8);
      const totalWon = smpWon + recWon;

      if (isJul) {
        julGenKwh = genKwh;
        julSmpWon = smpWon;
        julRecWon = recWon;
        julTotalWon = totalWon;
        julAvgHours = avgHours;
      }

      const rowStyle = isJul ? 'background:var(--sage-light); font-weight:800;' : '';
      const statusBadge = isJul ? '<span class="badge badge-success" style="font-weight:800; padding:4px 10px;">우수</span>' : '<span class="badge badge-success">정상</span>';

      return `
        <tr style="${rowStyle}">
          <td>${mInfo.month}</td>
          <td>${isJul ? `<strong>${genKwh.toLocaleString()}</strong>` : genKwh.toLocaleString()}</td>
          <td>${isJul ? `<strong>${smpWon.toLocaleString()}</strong>` : smpWon.toLocaleString()}</td>
          <td>${isJul ? `<strong>${recWon.toLocaleString()}</strong>` : recWon.toLocaleString()}</td>
          <td>${isJul ? `<strong>${totalWon.toLocaleString()}</strong>` : totalWon.toLocaleString()}</td>
          <td>${isJul ? `<strong>${avgHours}</strong>` : avgHours}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

    reportTableBody.innerHTML = tableRowsHtml;

    // Top 4 Summary Cards Update
    const julRevMan = (julTotalWon / 10000).toFixed(1);
    const julSmpMan = (julSmpWon / 10000).toFixed(1);
    const julRecMan = (julRecWon / 10000).toFixed(1);
    const julCo2 = (julGenKwh * 0.00047).toFixed(1);
    const julPines = Math.round(julGenKwh * 0.071).toLocaleString();
    const prVal = (83.8 + (parseInt(plantId, 10) % 4) * 0.5).toFixed(1);

    if (reportMonthlyGen) reportMonthlyGen.textContent = `${julGenKwh.toLocaleString()} kWh`;
    if (reportPrIndex) reportPrIndex.textContent = `성능지수(PR) ${prVal}%`;
    if (reportMonthlyRev) reportMonthlyRev.textContent = `${julRevMan} 만원`;
    if (reportSmpRecBreakdown) reportSmpRecBreakdown.textContent = `SMP ${julSmpMan}만 / REC ${julRecMan}만`;
    if (reportCo2) reportCo2.textContent = `${julCo2} tCO₂`;
    if (reportPineTrees) reportPineTrees.textContent = `소나무 ${julPines}그루 상당`;
    if (reportAvgGenHours) reportAvgGenHours.textContent = `${julAvgHours} 시간`;
    if (reportOperRate) reportOperRate.textContent = `가동률 100.0%`;

    // AI Diagnostics Box per Plant
    const aiReports = {
      "12139": `
        <div style="font-weight:900; color:var(--sage-dark, #3d5a47); font-size:15px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>🤖</span> <span>AI 종합 성능 진단 리포트 [원주 온누리3,4]</span>
        </div>
        • 2026년 7월 종합 발전 성능 지수(PR)는 <strong>${prVal}%</strong>로 우수 수준을 유지하고 있습니다.<br>
        • AI 고장 진단 엔진에 의해 인버터-2 DC 전압 미세 강하 원인이 감지되었으며, 접속반 점검으로 정상 조치되었습니다.<br>
        • 모듈 표면 세척 작업을 완료하면 월간 약 <strong>+25만원</strong>의 추가 수익 개선이 예상됩니다.
      `,
      "12138": `
        <div style="font-weight:900; color:var(--sage-dark, #3d5a47); font-size:15px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>🤖</span> <span>AI 종합 성능 진단 리포트 [원주 온누리1,2]</span>
        </div>
        • 2026년 7월 종합 발전 성능 지수(PR)는 <strong>${prVal}%</strong>로 최상위 발전 효율을 기록하고 있습니다.<br>
        • 모든 인버터(1~4호기) 전압 및 발전 효율 정상 가동 중이며, 영농 이행(옥수수/배추) 수광 상태 양호합니다.<br>
        • 옥수수 생육기 차광률 25.0% 유지로 영농 수확량 목표 달성이 안전하게 진행되고 있습니다.
      `,
      "12140": `
        <div style="font-weight:900; color:var(--sage-dark, #3d5a47); font-size:15px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>🤖</span> <span>AI 종합 성능 진단 리포트 [원주 온누리5,6]</span>
        </div>
        • 2026년 7월 종합 발전 성능 지수(PR)는 <strong>${prVal}%</strong>로 300kW 용량 대비 안정한 수익성을 유지 중입니다.<br>
        • 인버터-4 내부 방열 팬 필터 미세 먼지 누적으로 온도 47.8°C 감지. 주기적 방열 청소가 권장됩니다.<br>
        • 마늘/양파 재배구 일사량 투과율 69.8% 확보로 지자체 영농 행정 이행 완수 판정을 받았습니다.
      `,
      "12141": `
        <div style="font-weight:900; color:var(--sage-dark, #3d5a47); font-size:15px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>🤖</span> <span>AI 종합 성능 진단 리포트 [횡성 청정영농형1호]</span>
        </div>
        • 2026년 7월 대용량(500kW) 종합 발전 성능 지수(PR)는 <strong>${prVal}%</strong>로 최고 효율을 기록했습니다.<br>
        • 월 총 발전량 <strong>${julGenKwh.toLocaleString()} kWh</strong>, 월 매출 <strong>${julRevMan}만원</strong>으로 전체 5개 발전소 중 최다 수익을 달성하였습니다.<br>
        • 사과/인삼 영농 생육 관제 결과 병충해 및 잎 마름 증상 없이 지자체 검수 '우수' 등급이 부여되었습니다.
      `,
      "12142": `
        <div style="font-weight:900; color:var(--sage-dark, #3d5a47); font-size:15px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>🤖</span> <span>AI 종합 성능 진단 리포트 [춘천 소양강 영농]</span>
        </div>
        • 2026년 7월 종합 발전 성능 지수(PR)는 <strong>${prVal}%</strong>로 소양강 수변 지형의 모듈 냉각 효과가 확인되었습니다.<br>
        • 소형(150kW) 특화 모듈 가동률 100.0% 달성, 월 총 매출 <strong>${julRevMan}만원</strong>을 기록하였습니다.<br>
        • 블루베리/고추 토양 수분 45.2% 유지로 AI 자율 관수 분사 시스템이 최적 작동 중입니다.
      `
    };

    if (reportAiBox) {
      reportAiBox.innerHTML = aiReports[plantId] || aiReports["12139"];
    }
  },



  openDailyReportModal: function(day) {
    const yr = this.calendarCurrentYear || 2026;
    const mo = this.calendarCurrentMonth || 7;
    const plant = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.plants) ? (RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"]) : null;

    const modal = document.getElementById('dailyReportModal');
    if (!modal) return;

    const titleEl = document.getElementById('modalDateTitle');
    const plantSub = document.getElementById('modalPlantSub');
    if (titleEl) titleEl.textContent = `${yr}년 ${mo}월 ${day}일 일간 발전 리포트`;
    if (plantSub && plant) plantSub.textContent = plant.name;

    const baseGen = (plant ? plant.capacityKw : 200) * 3.2;
    const dayGen = Math.round(baseGen + ((day * 37 + mo * 19) % (baseGen * 0.4)));
    const dayRev = (dayGen * 0.0203).toFixed(1);
    const sunHours = (3.8 + (day % 3) * 0.7).toFixed(1);
    const peakKw = ((plant ? plant.capacityKw : 200) * (0.55 + (day % 4) * 0.08)).toFixed(1);

    const elDayGen = document.getElementById('modalDayGen');
    const elDayRev = document.getElementById('modalDayRev');
    const elDayHours = document.getElementById('modalDayHours');

    if (elDayGen) elDayGen.textContent = `${dayGen.toLocaleString()} kWh`;
    if (elDayRev) elDayRev.textContent = `${dayRev} 만원`;
    if (elDayHours) elDayHours.textContent = `${sunHours}h / ${peakKw}kW`;

    const invBody = document.getElementById('modalInverterBody');
    if (invBody && plant && plant.inverters) {
      invBody.innerHTML = plant.inverters.map(inv => {
        const invGen = Math.round(dayGen / plant.inverters.length);
        const invPower = (invGen / parseFloat(sunHours)).toFixed(1);
        const eff = (97.5 + (inv.id % 3) * 0.6).toFixed(1);
        return `
          <tr>
            <td>#${inv.id}</td>
            <td><strong>${invPower}kW</strong></td>
            <td>${sunHours}h</td>
            <td><strong>${invGen}kWh</strong></td>
            <td><span style="color:var(--sage-dark); font-weight:800;">${eff}%</span></td>
          </tr>
        `;
      }).join('');
    }

    const aiText = document.getElementById('modalAiText');
    if (aiText) {
      const weather = day % 4 === 0 ? '비/흐림' : (day % 3 === 0 ? '구름조금' : '맑음');
      const wTag = document.getElementById('modalWeatherTag');
      if (wTag) wTag.textContent = `날씨: ${day % 4 === 0 ? '⛈️ 흐림' : (day % 3 === 0 ? '☁️ 구름' : '☀️ 맑음')}`;
      aiText.textContent = `${yr}년 ${mo}월 ${day}일 (${weather}) 기준 전체 인버터 가동률 100% 달성. 평균 발전시간 ${sunHours}시간으로 목표 대비 상회함.`;
    }

    modal.style.display = 'flex';
  },

  closeDailyReportModal: function() {
    const modal = document.getElementById('dailyReportModal');
    if (modal) modal.style.display = 'none';
  },


  currentErrorFilter: 'all',

  filterErrorLogs: function(filterType) {
    this.currentErrorFilter = filterType || 'all';

    const btnAll = document.getElementById('btnErrFilterAll');
    const btnWarn = document.getElementById('btnErrFilterWarn');
    const btnRes = document.getElementById('btnErrFilterRes');

    if (btnAll) {
      btnAll.style.background = filterType === 'all' ? '#d06245' : 'var(--bg-card-subtle)';
      btnAll.style.color = filterType === 'all' ? '#ffffff' : 'var(--text-primary)';
    }
    if (btnWarn) {
      btnWarn.style.background = filterType === 'warning' ? '#d06245' : 'var(--bg-card-subtle)';
      btnWarn.style.color = filterType === 'warning' ? '#ffffff' : 'var(--text-primary)';
    }
    if (btnRes) {
      btnRes.style.background = filterType === 'resolved' ? '#d06245' : 'var(--bg-card-subtle)';
      btnRes.style.color = filterType === 'resolved' ? '#ffffff' : 'var(--text-primary)';
    }

    this.renderErrorLogsTable();
  },

  resolveErrorLog: function(idx) {
    if (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.errorLogs && RASSI_DATA.errorLogs[idx]) {
      RASSI_DATA.errorLogs[idx].status = 'resolved';
      RASSI_DATA.errorLogs[idx].statusText = '해제';
      RASSI_DATA.errorLogs[idx].stateText = '해제 완료';
      alert('✅ [AI 고장 조치 완료]\n선택한 AI 고장/경고 항목이 [해제 완료] 상태로 조치 전환되었습니다.');
      this.renderErrorLogsTable();
    }
  },

  renderErrorLogsTable: function() {
    const tbody = document.getElementById('errorLogsTableBody');
    if (!tbody) return;

    const filter = this.currentErrorFilter || 'all';
    const rawLogs = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.errorLogs) ? RASSI_DATA.errorLogs : [];
    
    const logsWithIdx = rawLogs.map((log, origIdx) => ({ log, origIdx }));
    const filtered = logsWithIdx.filter(item => {
      if (filter === 'warning') return item.log.status === 'warning';
      if (filter === 'resolved') return item.log.status === 'resolved';
      return true;
    });

    tbody.innerHTML = filtered.map(item => {
      const e = item.log;
      const idx = item.origIdx;
      const isWarn = e.status === 'warning';

      return `
        <tr>
          <td style="font-size:11.5px; color:var(--text-muted); font-weight:700;">${e.time}</td>
          <td><strong>${e.plant}</strong></td>
          <td style="font-weight:700; color:var(--sage-dark);">${e.device}</td>
          <td><strong style="color:${isWarn ? '#d06245' : '#0284c7'};">${e.type}</strong></td>
          <td><span class="badge ${isWarn ? 'badge-warning' : 'badge-success'}" style="font-weight:800;">${e.statusText}</span></td>
          <td style="font-size:12px; color:var(--text-secondary); text-align:left; line-height:1.5;">${e.desc}</td>
          <td>
            <span class="badge ${isWarn ? 'badge-warning' : 'badge-success'}" style="cursor:${isWarn ? 'pointer' : 'default'}; font-weight:800; padding:4px 8px;" onclick="${isWarn ? `DongyangApp.resolveErrorLog(${idx})` : ''}">
              ${isWarn ? '⚙️ 조치하기' : '✅ 해제완료'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  selectedComparePlantIds: ['12138', '12139', '12140', '12141', '12142'],

  toggleAddPlantPanel: function(forceState) {
    const panel = document.getElementById('addPlantExpandPanel');
    const arrow = document.getElementById('addPlantPanelArrow');
    if (!panel) return;

    const isVisible = panel.style.display !== 'none';
    const nextState = (typeof forceState === 'boolean') ? forceState : !isVisible;

    if (nextState) {
      this.renderAddPlantPanelList();
      panel.style.display = 'block';
      if (arrow) arrow.textContent = '▲';
    } else {
      panel.style.display = 'none';
      if (arrow) arrow.textContent = '▼';
    }
  },

  renderAddPlantPanelList: function() {
    const listCont = document.getElementById('addPlantPanelList');
    if (!listCont || typeof RASSI_DATA === 'undefined' || !RASSI_DATA.plants) return;

    const allPlants = RASSI_DATA.plants;
    const isOwner = this.currentUser && this.currentUser.role === 'owner';

    let html = '';
    if (isOwner) {
      html += `
        <div style="grid-column:1/-1; font-size:12px; font-weight:800; color:#d06245; background:rgba(208,98,69,0.08); padding:8px 12px; border-radius:8px; border:1px solid rgba(208,98,69,0.2); margin-bottom:4px;">
          🔒 발전사업자 권한: 본인 소유 발전소 (<strong>${allPlants[this.currentUser.plantId]?.name || '온누리3,4'}</strong>)가 기본 선택되어 있습니다. (관리자 계정은 전체 추가 가능)
        </div>
      `;
    }

    html += Object.keys(allPlants).map(id => {
      const p = allPlants[id];
      const isAdded = this.selectedComparePlantIds.includes(id);

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border-radius:10px; border:1px solid ${isAdded ? '#0284c7' : 'var(--border-color)'};">
          <div>
            <strong style="font-size:13px; color:var(--text-primary);">${p.name}</strong>
            <div style="font-size:11px; color:var(--text-muted);">용량: ${p.capacityKw}kW | 사업주: ${p.owner ? p.owner.split(' ')[0] : '동양연합'}</div>
          </div>
          ${isAdded ? `
            <span style="font-size:11.5px; font-weight:800; color:#0284c7; background:rgba(2,132,199,0.1); padding:4px 10px; border-radius:6px;">✓ 추가됨</span>
          ` : `
            <button style="padding:5px 12px; background:#0284c7; color:#fff; border:none; border-radius:6px; font-weight:800; font-size:11.5px; cursor:pointer;" onclick="DongyangApp.addPlantToCompare('${id}')">➕ 추가</button>
          `}
        </div>
      `;
    }).join('');

    listCont.innerHTML = html;
  },

  addPlantToCompare: function(plantId) {
    if (this.currentUser && this.currentUser.role === 'owner') {
      alert("🔒 [발전사업자 권한 안내]\n발전 사업자 회원님은 본인 소유 발전소가 기본 1개로 설정되어 비교 분석됩니다.\n\n타 발전소 추가 조회가 필요하신 경우 [관리자(admin)] 계정으로 로그인해 주세요.");
      return;
    }
    if (!this.selectedComparePlantIds.includes(plantId)) {
      this.selectedComparePlantIds.push(plantId);
      this.renderCompareTable();
      this.renderAddPlantPanelList();
    }
  },

  removeComparePlant: function(plantId) {
    if (this.selectedComparePlantIds.length <= 1) {
      alert("비교 분석을 위해 최소 1개 이상의 발전소가 표에 유지되어야 합니다.");
      return;
    }
    this.selectedComparePlantIds = this.selectedComparePlantIds.filter(id => id !== plantId);
    this.renderCompareTable();
    this.renderAddPlantPanelList();
  },

  renderCompareTable: function() {
    const tbody = document.getElementById('compareTableBody');
    if (!tbody || typeof RASSI_DATA === 'undefined' || !RASSI_DATA.plants) return;

    const selectedPlants = this.selectedComparePlantIds.map(id => RASSI_DATA.plants[id]).filter(Boolean);

    let totalCap = 0;
    let totalGen = 0;
    let totalRev = 0;

    const rowsHtml = selectedPlants.map(p => {
      totalCap += p.capacityKw;
      totalGen += p.todayGenKwh;
      totalRev += parseFloat(p.todayRevenueMan);

      return `
        <tr>
          <td style="text-align:left; padding-left:14px;"><strong>${p.name}</strong></td>
          <td>${p.capacityKw} kW</td>
          <td><strong style="color:#0284c7;">${p.todayGenKwh} kWh</strong></td>
          <td>${p.todayGenHours} 시간</td>
          <td><strong style="color:#10b981;">84.5 %</strong></td>
          <td><strong style="color:#d06245;">${p.todayRevenueMan} 만원</strong></td>
          <td>295 원/kWh</td>
          <td><strong style="color:var(--sage-dark);">${p.cropGrowthIndex}</strong></td>
          <td><span class="badge badge-success" style="font-weight:800; padding:4px 8px;">🟢 우수</span></td>
          <td>
            <button style="padding:3px 10px; font-size:11.5px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:6px; font-weight:800; cursor:pointer;" onclick="DongyangApp.removeComparePlant('${p.id}')" title="비교 표에서 제외">➖ 빼기</button>
          </td>
        </tr>
      `;
    }).join('');

    const avgGenHours = totalCap > 0 ? (totalGen / totalCap).toFixed(2) : '0';

    const summaryRow = `
      <tr style="background:var(--sage-light, #edf4ef); font-weight:900; border-top:2px solid var(--sage-primary);">
        <td style="text-align:left; padding-left:14px;">합계 / 평균 (${selectedPlants.length}개 발전소)</td>
        <td><strong>${totalCap} kW</strong></td>
        <td><strong style="color:#0284c7;">${totalGen.toLocaleString()} kWh</strong></td>
        <td>${avgGenHours} 시간</td>
        <td><strong style="color:#10b981;">84.5 %</strong></td>
        <td><strong style="color:#d06245;">${totalRev.toFixed(1)} 만원</strong></td>
        <td>295 원/kWh</td>
        <td>95.4% (평균)</td>
        <td><span class="badge badge-success">🟢 최적</span></td>
        <td>-</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml + summaryRow;
  },




  updateTimestamp: function() {
    const el = document.getElementById('liveTimestamp');
    if (!el) return;
    const now = new Date();
    el.innerText = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  },

  toggleTheme: function() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
  },

  toggleMobileSim: function() {
    this.isMobileSimMode = !this.isMobileSimMode;
    if (this.isMobileSimMode) document.body.classList.add('mobile-sim-mode');
    else document.body.classList.remove('mobile-sim-mode');

    setTimeout(() => {
      if (typeof RassiCharts !== 'undefined') {
        if (RassiCharts.hourlyChart) RassiCharts.hourlyChart.resize();
        if (RassiCharts.monthlyChart) RassiCharts.monthlyChart.resize();
        if (RassiCharts.yearlyChart) RassiCharts.yearlyChart.resize();
      }
      if (typeof AgriCharts !== 'undefined' && AgriCharts.instances) {
        if (AgriCharts.instances.activityTrend) AgriCharts.instances.activityTrend.resize();
        if (AgriCharts.instances.complianceDist) AgriCharts.instances.complianceDist.resize();
      }
    }, 250);
  },


  updatePlantOverviewCard: function() {
    const plant = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.plants) ? (RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"]) : null;
    if (!plant) return;

    const fin = (typeof computePlantFinancials === 'function') ? computePlantFinancials(plant) : {
      todaySmpText: plant.cardTodaySmp || '45,587 원',
      todayRecText: plant.cardTodayRec || '24,993 원',
      todayTotalText: plant.cardTodayTotal || '70,580 원',
      monthlySmpText: plant.cardMonthlySmp || '200.7 만원',
      monthlyRecText: plant.cardMonthlyRec || '110.0 만원',
      monthlyTotalText: plant.cardMonthlyTotal || '310.8 만원',
      totalRecRevenueText: plant.cardTotalRec || '3,231 만원'
    };

    const elName = document.getElementById('cardPlantName');
    const elCap = document.getElementById('cardPlantCapacity');
    const elTemp = document.getElementById('cardPlantTemp');
    const elPower = document.getElementById('cardCurrentPower');
    const elGen = document.getElementById('cardTodayGen');
    const elGenHours = document.getElementById('cardTodayGenHours');
    const elSmp = document.getElementById('cardTodaySmp');
    const elRec = document.getElementById('cardTodayRec');
    const elTotal = document.getElementById('cardTodayTotal');
    const elMonGen = document.getElementById('cardMonthlyGen');
    const elMonSmp = document.getElementById('cardMonthlySmp');
    const elMonRec = document.getElementById('cardMonthlyRec');
    const elMonTotal = document.getElementById('cardMonthlyTotal');
    const elTotRec = document.getElementById('cardTotalRec');
    const elSts = document.getElementById('cardPlantStatus');

    if (elName) elName.textContent = plant.shortName || plant.name.replace(/^\[.*?\]\s*/, '');
    if (elCap) elCap.textContent = '설비용량: ' + plant.capacityKw + 'kW';
    if (elTemp) elTemp.textContent = plant.cardTemp || '28.2 °C';
    if (elPower) elPower.textContent = plant.cardCurrentPower || plant.currentPowerKw + ' kW';
    if (elGen) elGen.textContent = plant.cardTodayGen || plant.todayGenKwh + ' kWh';
    if (elGenHours) elGenHours.textContent = plant.cardTodayGenHours || '1.74 시간';
    if (elSmp) elSmp.textContent = fin.todaySmpText;
    if (elRec) elRec.textContent = fin.todayRecText;
    if (elTotal) elTotal.textContent = fin.todayTotalText;
    if (elMonGen) elMonGen.textContent = plant.cardMonthlyGen || '15,323 kWh';
    if (elMonSmp) elMonSmp.textContent = fin.monthlySmpText;
    if (elMonRec) elMonRec.textContent = fin.monthlyRecText;
    if (elMonTotal) elMonTotal.textContent = fin.monthlyTotalText;
    if (elTotRec) elTotRec.textContent = fin.totalRecRevenueText;
    if (elSts) elSts.textContent = plant.cardStatus || '정상작동';
  },

  openPlantDetailModal: function() {
    const modal = document.getElementById('plantDetailModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');

    const dateInput = document.getElementById('plantModalDateInput');
    if (dateInput) {
      dateInput.value = "2026-07-22";
    }
    this.updatePlantModalChart("2026-07-22");
  },

  closePlantDetailModal: function() {
    const modal = document.getElementById('plantDetailModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  },

  changePlantModalDate: function(daysDelta) {
    const input = document.getElementById('plantModalDateInput');
    if (!input) return;
    const curDate = new Date(input.value || "2026-07-22");
    curDate.setDate(curDate.getDate() + daysDelta);
    input.value = curDate.toISOString().split('T')[0];
    this.updatePlantModalChart(input.value);
  },

  plantModalChartInstance: null,

  updatePlantModalChart: function(selectedDateStr) {
    const plant = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.plants) ? (RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"]) : null;
    const dateStr = selectedDateStr || document.getElementById('plantModalDateInput')?.value || "2026-07-22";

    const elTitle = document.getElementById('plantModalTitle');
    if (elTitle) elTitle.textContent = dateStr + ' 발전량';

    const elSumGen = document.getElementById('modalSummaryGen');
    const elSumSmp = document.getElementById('modalSummarySmp');
    const elSumHours = document.getElementById('modalSummaryHours');

    if (plant) {
      if (elSumGen) elSumGen.textContent = (plant.cardTodayGen || plant.todayGenKwh + ' kWh');
      if (elSumSmp) elSumSmp.textContent = (plant.cardTodaySmp || '45,587 원');
      if (elSumHours) elSumHours.textContent = (plant.cardTodayGenHours || '1.74 시간');
    }

    const ctx = document.getElementById('plantDetailModalChart');
    if (!ctx) return;

    if (this.plantModalChartInstance) {
      this.plantModalChartInstance.destroy();
    }

    const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const genData = [4, 18, 52, 75, 48, 62, 12, 0];
    const peakData = [12, 28, 120, 195, 105, 150, 25, 0];

    this.plantModalChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [
          {
            label: '발전량 (kWh)',
            data: genData,
            backgroundColor: 'rgba(2, 132, 199, 0.7)',
            borderColor: '#0284c7',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: '최고 출력 (kW)',
            data: peakData,
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            borderWidth: 2.5,
            pointRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '발전량 (kWh)' }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            title: { display: true, text: '출력 (kW)' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  },

  fetchRealtimeRecData: function() {
    const recPriceEl = document.getElementById('recMarketPrice');
    const smpPriceEl = document.getElementById('smp-land-price');
    const recBadge = document.getElementById('recMarketSyncBadge');
    const smpBadge = document.getElementById('smpMarketSyncBadge');

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (recBadge) recBadge.innerText = `🟢 KPX 동기화 (${timeStr})`;
    if (smpBadge) smpBadge.innerText = `🟢 KPX 동기화 (${timeStr})`;

    const randomRec = (74800 + Math.floor(Math.random() * 400 - 200)).toLocaleString();
    const randomSmp = (132.5 + (Math.random() * 0.6 - 0.3)).toFixed(1);

    if (recPriceEl) recPriceEl.innerHTML = `${randomRec} <span style="font-size:11px; font-weight:700;">원/REC</span>`;
    if (smpPriceEl) smpPriceEl.innerText = randomSmp;

    if (typeof RassiCharts !== 'undefined') {
      if (RassiCharts.recChart) RassiCharts.recChart.update();
      if (RassiCharts.smpChart) RassiCharts.smpChart.update();
    }

    alert(`[KPX 전력거래소 실시간 연동]\n${timeStr} 기준 최신 REC 및 SMP 시세 정보가 성공적으로 동기화되었습니다.`);
  },

  currentEquipmentSubTab: 'inverter',

  switchEquipmentSubTab: function(subTabKey) {
    this.currentEquipmentSubTab = subTabKey || 'inverter';

    const btnInv = document.getElementById('subTabInverter');
    const btnMppt = document.getElementById('subTabMppt');

    if (btnInv && btnMppt) {
      btnInv.removeAttribute('style');
      btnMppt.removeAttribute('style');
      if (this.currentEquipmentSubTab === 'inverter') {
        btnInv.classList.add('active');
        btnMppt.classList.remove('active');
      } else {
        btnMppt.classList.add('active');
        btnInv.classList.remove('active');
      }
    }

    this.renderEquipmentTable();
  },


  renderEquipmentTable: function() {
    const p = (typeof RASSI_DATA !== 'undefined' && RASSI_DATA.plants) ? (RASSI_DATA.plants[this.currentPlantId] || RASSI_DATA.plants["12139"]) : null;
    if (!p) return;

    const titleEl = document.getElementById('equipmentHeaderTitle');
    if (titleEl) {
      const pName = p.shortName || p.name.replace(/^\[.*?\]\s*/, '');
      titleEl.textContent = `[${p.id}] ${pName} 설비 현황`;
    }

    const thead = document.getElementById('equipmentTableHead');
    const tbody = document.getElementById('equipmentTableBody');
    if (!thead || !tbody) return;

    const sub = this.currentEquipmentSubTab || 'inverter';

    if (sub === 'inverter') {
      thead.innerHTML = `
        <tr>
          <th>번호</th>
          <th>상태</th>
          <th>입력전압(V)</th>
          <th>입력전류(A)</th>
          <th>입력전력(kW)</th>
          <th>출력전압 L1,L2,L3(V)</th>
          <th>출력전류 L1,L2,L3(A)</th>
          <th>출력전력(kW)</th>
          <th>PEAK(kW)</th>
          <th>주파수(Hz)</th>
          <th>온도(°C)</th>
          <th>일일발전량(kWh)</th>
          <th>최종통신시간</th>
        </tr>
      `;

      const list = p.inverters || [
        { id: 1, powerKw: 9.6, runHours: 1.3, todayGenKwh: 78, state: "가동", comm: "17:15:09", dcV: 624.5, dcA: 15.4, acV: "382.5, 382.1, 382.8", acA: "14.5, 14.4, 14.5", temp: 42.1 },
        { id: 2, powerKw: 8.3, runHours: 1.1, todayGenKwh: 67, state: "가동", comm: "17:15:10", dcV: 613.0, dcA: 13.5, acV: "381.8, 381.9, 382.0", acA: "12.5, 12.6, 12.5", temp: 44.5 }
      ];

      let totalDcP = 0;
      let totalAcP = 0;
      let totalTodayGen = 0;

      const rowsHtml = list.map(inv => {
        const dcP = (inv.powerKw * 1.05).toFixed(1);
        const acP = inv.powerKw.toFixed(1);
        const peak = (inv.powerKw * 1.25).toFixed(1);
        totalDcP += parseFloat(dcP);
        totalAcP += parseFloat(acP);
        totalTodayGen += inv.todayGenKwh;

        return `
          <tr>
            <td>#${inv.id} 호기</td>
            <td><span style="color:#10b981; font-weight:800;">🟢 가동</span></td>
            <td>${inv.dcV || 620}</td>
            <td>${inv.dcA || 15.2}</td>
            <td>${dcP}</td>
            <td>${inv.acV || '382.5,382.1,382.8'}</td>
            <td>${inv.acA || '14.5,14.4,14.5'}</td>
            <td><strong>${acP}</strong></td>
            <td>${peak}</td>
            <td>60.0</td>
            <td>${inv.temp || 42.0}</td>
            <td><strong>${inv.todayGenKwh}</strong></td>
            <td style="color:var(--text-muted); font-size:11.5px;">${inv.comm || '17:15:09'}</td>
          </tr>
        `;
      }).join('');

      const summaryHtml = `
        <tr class="summary-row" style="background:var(--bg-card-subtle, #f8fafc); font-weight:800; border-bottom:2px solid var(--border-color, #cbd5e1);">
          <td>합계 (${list.length}대)</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>${totalDcP.toFixed(1)}</td>
          <td>-</td>
          <td>-</td>
          <td><strong>${totalAcP.toFixed(1)} kW</strong></td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td><strong>${totalTodayGen.toLocaleString()} kWh</strong></td>
          <td>-</td>
        </tr>
      `;

      tbody.innerHTML = summaryHtml + rowsHtml;
    } else {
      // MPPT Sub Tab
      thead.innerHTML = `
        <tr>
          <th>번호</th>
          <th>구분</th>
          <th>1CH (A)</th>
          <th>2CH (A)</th>
          <th>3CH (A)</th>
          <th>4CH (A)</th>
          <th>상태</th>
          <th>스트링 설정</th>
        </tr>
      `;

      const list = p.inverters || [{ id: 1, dcA: 15 }, { id: 2, dcA: 14 }];
      tbody.innerHTML = list.map(inv => {
        const baseA = (inv.dcA ? (inv.dcA * 0.25).toFixed(1) : '3.8');
        return `
          <tr>
            <td>#${inv.id} 호기</td>
            <td><strong>MPPT</strong></td>
            <td>${baseA}</td>
            <td>${baseA}</td>
            <td>${baseA}</td>
            <td>0.0</td>
            <td><span style="color:#10b981; font-weight:800;">🟢 정상</span></td>
            <td><button class="btn-header" style="padding:4px 10px; font-size:11px; cursor:pointer; background:var(--bg-card-subtle); border:1px solid var(--border-color); border-radius:6px;" onclick="DongyangApp.openStringConfigModal(${inv.id})">⚙️ 설정</button></td>
          </tr>
        `;
      }).join('');
    }
  },

  currentConfigInverterId: 1,

  openStringConfigModal: function(invId) {
    this.currentConfigInverterId = invId || 1;
    const modal = document.getElementById('stringConfigModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  },

  closeStringConfigModal: function() {
    const modal = document.getElementById('stringConfigModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  saveStringConfig: function() {
    const ch1 = document.getElementById('stringCh1')?.checked;
    const ch2 = document.getElementById('stringCh2')?.checked;
    const ch3 = document.getElementById('stringCh3')?.checked;
    const ch4 = document.getElementById('stringCh4')?.checked;

    alert(`[인버터 #${this.currentConfigInverterId}호기 스트링 결선 설정 저장 완료]\nCH1: ${ch1 ? 'ON' : 'OFF'}, CH2: ${ch2 ? 'ON' : 'OFF'}, CH3: ${ch3 ? 'ON' : 'OFF'}, CH4: ${ch4 ? 'ON' : 'OFF'}`);
    this.closeStringConfigModal();
  },

  applyAllStringConfig: function() {
    const ch1 = document.getElementById('stringCh1')?.checked;
    const ch2 = document.getElementById('stringCh2')?.checked;
    const ch3 = document.getElementById('stringCh3')?.checked;
    const ch4 = document.getElementById('stringCh4')?.checked;

    alert(`[전체 인버터 스트링 결선 설정 일괄 적용 완료]\n모든 인버터에 동일 설정이 적용되었습니다.\n(CH1: ${ch1 ? 'ON' : 'OFF'}, CH2: ${ch2 ? 'ON' : 'OFF'}, CH3: ${ch3 ? 'ON' : 'OFF'}, CH4: ${ch4 ? 'ON' : 'OFF'})`);
    this.closeStringConfigModal();
  },


  openInverterLogModal: function() {
    const modal = document.getElementById('inverterLogModal');
    if (modal) {
      modal.style.display = 'flex';
      this.renderInverterLogTable();
    }
  },

  closeInverterLogModal: function() {
    const modal = document.getElementById('inverterLogModal');
    if (modal) modal.style.display = 'none';
  },

  searchInverterLog: function() {
    this.renderInverterLogTable();
  },

  renderInverterLogTable: function() {
    const tbody = document.getElementById('inverterLogTableBody');
    if (!tbody) return;

    const select = document.getElementById('inverterLogSelect');
    const invId = select ? select.value : '1';

    const sampleLogs = [
      { id: invId, dcV: 595, dcA: 2.7, dcP: 2.2, rstV: '380,382,381', rstA: '3.9,4.4,4.2', acP: 1.7, freq: 60, pf: -85.6, state: '가동', time: '2026-07-22 17:26:03' },
      { id: invId, dcV: 595, dcA: 3.1, dcP: 2.4, rstV: '383,385,384', rstA: '4.1,4.2,4.3', acP: 1.9, freq: 60, pf: -89.1, state: '가동', time: '2026-07-22 17:21:02' },
      { id: invId, dcV: 595, dcA: 3.7, dcP: 2.8, rstV: '382,383,383', rstA: '4.6,4.7,4.8', acP: 2.3, freq: 60, pf: -90.8, state: '가동', time: '2026-07-22 17:16:02' }
    ];

    tbody.innerHTML = sampleLogs.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.dcV}</td>
        <td>${row.dcA}</td>
        <td>${row.dcP}</td>
        <td>${row.rstV}</td>
        <td>${row.rstA}</td>
        <td><strong>${row.acP}</strong></td>
        <td>${row.freq}</td>
        <td>${row.pf}</td>
        <td><span class="badge badge-success">${row.state}</span></td>
        <td style="color:var(--text-muted); font-size:11.5px;">${row.time}</td>
      </tr>
    `).join('');
  },

  openMpptLogModal: function() {
    const modal = document.getElementById('mpptLogModal');
    if (modal) {
      modal.style.display = 'flex';
      this.renderMpptLogChart();
    }
  },

  closeMpptLogModal: function() {
    const modal = document.getElementById('mpptLogModal');
    if (modal) modal.style.display = 'none';
  },

  searchMpptLog: function() {
    this.renderMpptLogChart();
  },

  toggleMpptLogView: function(mode) {
    const chartCont = document.getElementById('mpptChartContainer');
    if (chartCont) chartCont.style.display = mode === 'chart' ? 'block' : 'none';
    const tableCont = document.getElementById('mpptTableContainer');
    if (tableCont) tableCont.style.display = mode === 'table' ? 'block' : 'none';
  },

  mpptChartInstance: null,

  renderMpptLogChart: function() {
    const ctx = document.getElementById('mpptLogChartCanvas')?.getContext('2d');
    if (!ctx) return;

    if (this.mpptChartInstance) {
      this.mpptChartInstance.destroy();
    }

    const labels = [
      '07-20 13:00', '07-20 16:00', '07-20 19:00',
      '07-21 00:06', '07-21 06:00', '07-21 11:13', '07-21 16:00', '07-21 22:20',
      '07-22 04:00', '07-22 09:26', '07-22 13:00', '07-22 17:00'
    ];

    this.mpptChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'CH1', data: [2, 12, 1, 0, 1, 10, 4, 0, 0, 8, 14, 2], borderColor: '#3b82f6', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
          { label: 'CH2', data: [1.8, 11.5, 0.8, 0, 0.8, 9.2, 3.5, 0, 0, 7.5, 13.2, 1.8], borderColor: '#475569', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
          { label: 'CH3', data: [2.2, 15.8, 1.2, 0, 1.2, 23.1, 5.8, 0, 0, 16.5, 15.0, 2.2], borderColor: '#22c55e', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
          { label: 'CH4', data: [0.1, 0.2, 0.1, 0, 0.1, 0.2, 0.1, 0, 0, 0.1, 0.2, 0.1], borderColor: '#f97316', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, max: 25 } }
      }
    });
  },

  downloadReportPdf: function() {
    alert("📄 [태양광 관제 정기 보고서 PDF 다운로드]\n2026년 7월 정기 발전 및 AI 수익 분석 보고서 (PDF) 인쇄 및 파일 다운로드가 시작됩니다.");
    window.print();
  },

  exportToExcel: function(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) {
      alert("내보낼 테이블 데이터가 존재하지 않습니다.");
      return;
    }
    let csv = [];
    const rows = table.querySelectorAll("tr");
    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll("td, th");
      for (let j = 0; j < cols.length; j++) {
        let text = cols[j].innerText.replace(/"/g, '""').trim();
        row.push('"' + text + '"');
      }
      csv.push(row.join(","));
    }
    const csvFile = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadLink = document.createElement("a");
    downloadLink.download = (filename || "태양광_모니터링_보고서") + ".csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  },

  toggleMobileNav: function() {
    const sidebar = document.querySelector('.left-sidebar');
    if (sidebar) sidebar.classList.toggle('drawer-open');
  }
};

window.addEventListener('DOMContentLoaded', () => DongyangApp.init());




